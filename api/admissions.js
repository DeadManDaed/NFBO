// api/admissions.js  →  /api/admissions et /api/admissions?id=X
const { withCors } = require('./_lib/cors');
const { requireAuth } = require('./_lib/auth');
const pool = require('./_lib/db');

module.exports = withCors(requireAuth(async (req, res) => {
  const { id } = req.query;

  // GET /api/admissions
if (req.method === 'GET') {
  try {
    const { magasin_id, limit = 100 } = req.query;
    let query = `
  SELECT a.*, l.description AS lot_description, l.unites_admises AS unite, p.nom_producteur, m.nom AS magasin_nom
      FROM admissions a
      LEFT JOIN lots l ON l.id = a.lot_id
      LEFT JOIN producteurs p ON p.id = a.producteur_id
      LEFT JOIN magasins m ON m.id = a.magasin_id
    `;
    const params = [];
    if (magasin_id) {
      query += ' WHERE a.magasin_id = $1';
      params.push(magasin_id);
    }
    query += ' ORDER BY a.date_reception DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
  // POST /api/admissions
if (req.method === 'POST') {
    if (!['superadmin', 'admin', 'stock'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const {
      lot_id, producteur_id, quantite, unite, prix_ref,
      coef_qualite, date_expiration, magasin_id, mode_paiement, utilisateur
    } = req.body;

    // Validation basique
    if (!lot_id || !producteur_id || !quantite || !unite || !magasin_id) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    try {
      const date_reception = new Date().toISOString();
      const result = await pool.query(
        `INSERT INTO admissions (
          lot_id, producteur_id, quantite, unite, prix_ref,
          coef_qualite, date_reception, date_expiration,
          magasin_id, mode_paiement, utilisateur
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          parseInt(lot_id), parseInt(producteur_id), parseFloat(quantite),
          unite, parseFloat(prix_ref), parseFloat(coef_qualite),
          date_reception, date_expiration || null,
          parseInt(magasin_id), mode_paiement, utilisateur || req.user.username
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Erreur SQL Admission:', err.message);
      return res.status(500).json({ error: 'Erreur SQL', details: err.message });
    }
  }

  // DELETE /api/admissions?id=X
  if (req.method === 'DELETE' && id) {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Suppression réservée au superadmin' });
    }
    try {
      const result = await pool.query('DELETE FROM admissions WHERE id=$1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Admission introuvable' });
      return res.json({ message: 'Admission supprimée', admission: result.rows[0] });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  }

  res.status(405).end();
}));
