// api/magasins.js  →  /api/magasins et /api/magasins?id=X
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');
const { requireAuth } = require('./_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  const { id } = req.query;

  // GET /api/magasins
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT m.id, m.nom, m.code, m.region_id, r.nom AS region
         FROM magasins m
         LEFT JOIN regions r ON m.region_id = r.id
         ORDER BY m.id`
      );
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // POST /api/magasins
  if (req.method === 'POST') {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Création réservée au superadmin' });
    }
    const { nom, region_id, code } = req.body;
    try {
      if (region_id) {
        const check = await pool.query('SELECT id FROM regions WHERE id=$1', [region_id]);
        if (check.rowCount === 0) return res.status(400).json({ error: 'Region inexistante' });
      }
      const result = await pool.query(
        'INSERT INTO magasins (nom, region_id, code) VALUES ($1,$2,$3) RETURNING *',
        [nom, region_id, code]
      );
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // PUT /api/magasins?id=X
  if (req.method === 'PUT' && id) {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Modification réservée au superadmin' });
    }
    const { nom, region_id, code } = req.body;
    try {
      if (region_id) {
        const check = await pool.query('SELECT id FROM regions WHERE id=$1', [region_id]);
        if (check.rowCount === 0) return res.status(400).json({ error: 'Region inexistante' });
      }
      const result = await pool.query(
        'UPDATE magasins SET nom=$1, region_id=$2, code=$3 WHERE id=$4 RETURNING *',
        [nom, region_id, code, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Magasin introuvable' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // DELETE /api/magasins?id=X
  if (req.method === 'DELETE' && id) {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Suppression réservée au superadmin' });
    }
    try {
      await pool.query('DELETE FROM magasins WHERE id=$1', [id]);
      return res.json({ message: 'Magasin supprimé (cascade sur admissions, retraits, employés)' });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  res.status(405).end();
}));
