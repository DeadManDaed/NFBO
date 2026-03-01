// api/lots/index.js  →  Gère /api/lots/* et /api/lots/stock
//
// Routes exposées :
//   GET    /api/lots               → liste tous les lots
//   GET    /api/lots?id=X          → un lot par id
//   POST   /api/lots               → créer un lot
//   PUT    /api/lots?id=X          → modifier un lot
//   DELETE /api/lots?id=X          → supprimer un lot
//   GET    /api/lots/stock?magasinId=X  → stock calculé d'un magasin (ex-api/stocks.js)

const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  const { id, magasinId } = req.query;

  // Détecter le sous-chemin : /api/lots/stock
  const url = req.url?.split('?')[0].replace(/\/$/, '');
  const isStockRoute = url.endsWith('/stock');

  // ─── GET /api/lots/stock?magasinId=X  (ex-stocks.js) ─────────────────────────
  if (isStockRoute && req.method === 'GET') {
    if (!magasinId) {
      return res.status(400).json({ error: 'magasinId requis' });
    }
    try {
      const result = await pool.query(
        `WITH adm AS (
          SELECT lot_id, magasin_id, SUM(quantite) AS total_adm, MAX(unite) AS unite
          FROM admissions
          WHERE magasin_id = $1
          GROUP BY lot_id, magasin_id
        ),
        ret AS (
          SELECT lot_id, magasin_id, SUM(quantite) AS total_ret
          FROM retraits
          WHERE magasin_id = $1
          GROUP BY lot_id, magasin_id
        )
        SELECT
          a.lot_id,
          l.description,
          COALESCE(a.unite, '') AS unite,
          l.prix_ref,
          l.unites_admises,
          (COALESCE(a.total_adm, 0) - COALESCE(r.total_ret, 0))::numeric AS stock_actuel
        FROM adm a
        LEFT JOIN ret r ON r.lot_id = a.lot_id AND r.magasin_id = a.magasin_id
        LEFT JOIN lots l ON l.id = a.lot_id
        WHERE (COALESCE(a.total_adm, 0) - COALESCE(r.total_ret, 0)) > 0
        ORDER BY l.description`,
        [magasinId]
      );
      return res.json(result.rows);
    } catch (err) {
      console.error('[lots/stock] Erreur SQL:', err.message);
      return res.status(500).json({ error: 'Erreur serveur lors de la récupération du stock' });
    }
  }

  // ─── GET /api/lots  (liste complète) ─────────────────────────────────────────
  if (req.method === 'GET' && !id) {
    try {
      const result = await pool.query('SELECT * FROM lots ORDER BY date_creation DESC');
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ message: 'Erreur lors de la récupération des lots' });
    }
  }

  // ─── GET /api/lots?id=X ───────────────────────────────────────────────────────
  if (req.method === 'GET' && id) {
    try {
      const result = await pool.query('SELECT * FROM lots WHERE id=$1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Lot non trouvé' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: "Erreur lors de l'extraction du lot" });
    }
  }

  // ─── POST /api/lots ───────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { categorie, description, prix_ref, unites_admises, criteres_admission, notes } = req.body;
    if (!categorie || !description || !prix_ref) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (categorie, description, prix_ref)' });
    }
    try {
      const result = await pool.query(
        `INSERT INTO lots (categorie, description, prix_ref, unites_admises, criteres_admission, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [categorie, description, prix_ref, JSON.stringify(unites_admises || []), JSON.stringify(criteres_admission || []), notes || null]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[lots POST] Erreur:', err.message);
      return res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
    }
  }

  // ─── PUT /api/lots?id=X ───────────────────────────────────────────────────────
  if (req.method === 'PUT' && id) {
    const { description, categorie, prix_ref, unites_admises, criteres_admission } = req.body;
    try {
      const result = await pool.query(
        `UPDATE lots
         SET description=$1, categorie=$2, prix_ref=$3, unites_admises=$4, criteres_admission=$5
         WHERE id=$6 RETURNING *`,
        [description, categorie, prix_ref || 0, JSON.stringify(unites_admises || []), JSON.stringify(criteres_admission || []), id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Lot non trouvé' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ message: 'Erreur lors de la modification' });
    }
  }

  // ─── DELETE /api/lots?id=X ────────────────────────────────────────────────────
  if (req.method === 'DELETE' && id) {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Suppression réservée au superadmin' });
    }
    try {
      const result = await pool.query('DELETE FROM lots WHERE id=$1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Lot non trouvé' });
      return res.json({ message: 'Lot supprimé avec succès', lot: result.rows[0] });
    } catch (err) {
      console.error('[lots DELETE] Erreur:', err.message);
      // Erreur FK = lot utilisé dans admissions
      if (err.code === '23503') {
        return res.status(409).json({ message: 'Impossible de supprimer ce lot (utilisé dans des admissions)' });
      }
      return res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
    }
  }

  return res.status(405).json({ error: `Méthode non supportée : ${req.method}` });
}));
