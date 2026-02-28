// api/producteurs.js  →  /api/producteurs et /api/producteurs/[id]
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');
const { requireAuth } = require('./_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  const { id } = req.query; // Vercel expose les query params, y compris les segments dynamiques

  // GET /api/producteurs
  if (req.method === 'GET' && !id) {
    try {
      const result = await pool.query('SELECT * FROM producteurs ORDER BY id DESC');
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // GET /api/producteurs?id=X
  if (req.method === 'GET' && id) {
    try {
      const result = await pool.query('SELECT * FROM producteurs WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Producteur introuvable' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // POST /api/producteurs
  if (req.method === 'POST') {
    const {
      nom_producteur, tel_producteur, type_producteur, carte_membre,
      points_fidelite, solde, statut, region_id, departement_id,
      arrondissement_id, localite
    } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO producteurs 
         (nom_producteur, tel_producteur, type_producteur, carte_membre, points_fidelite, solde, statut, region_id, departement_id, arrondissement_id, localite)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          nom_producteur, tel_producteur, type_producteur,
          carte_membre || false, points_fidelite || 0, solde || 0,
          statut || 'en_attente', region_id || null, departement_id || null,
          arrondissement_id || null, localite || null
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(400).json({ error: "Erreur lors de l'ajout du producteur" });
    }
  }

  // PUT /api/producteurs?id=X
  if (req.method === 'PUT' && id) {
    const {
      nom_producteur, tel_producteur, type_producteur, carte_membre,
      points_fidelite, solde, statut, region_id, departement_id,
      arrondissement_id, localite
    } = req.body;

    try {
      const result = await pool.query(
        `UPDATE producteurs SET
          nom_producteur=$1, tel_producteur=$2, type_producteur=$3,
          carte_membre=$4, points_fidelite=$5, solde=$6, statut=$7,
          region_id=$8, departement_id=$9, arrondissement_id=$10, localite=$11
         WHERE id=$12 RETURNING *`,
        [
          nom_producteur, tel_producteur, type_producteur,
          carte_membre, points_fidelite, solde, statut,
          region_id, departement_id, arrondissement_id, localite, id
        ]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Producteur introuvable' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(400).json({ error: 'Erreur lors de la mise à jour' });
    }
  }

  // DELETE /api/producteurs?id=X
  if (req.method === 'DELETE' && id) {
    try {
      const result = await pool.query('DELETE FROM producteurs WHERE id=$1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Producteur introuvable' });
      return res.json({ message: 'Producteur supprimé', producteur: result.rows[0] });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  }

  res.status(405).end();
}));