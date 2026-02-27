// api/employers.js  →  /api/employers et /api/employers?id=X&magasin_id=Y
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  const { id, magasin_id } = req.query;

  // GET /api/employers  ou  GET /api/employers?magasin_id=X
  if (req.method === 'GET') {
    try {
      let query = 'SELECT id, nom, role, contact, date_embauche, statut, magasin_id FROM employers';
      let params = [];
      if (magasin_id) {
        query += ' WHERE magasin_id=$1';
        params.push(magasin_id);
      }
      query += ' ORDER BY nom';
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // POST /api/employers
  if (req.method === 'POST') {
    const { magasin_id: mg, nom, role, contact, date_embauche } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO employers (magasin_id, nom, role, contact, date_embauche)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [mg, nom, role, contact, date_embauche]
      );
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // PUT /api/employers?id=X
  if (req.method === 'PUT' && id) {
    const { nom, role, contact, statut } = req.body;
    try {
      const result = await pool.query(
        `UPDATE employers SET nom=$1, role=$2, contact=$3, statut=$4 WHERE id=$5 RETURNING *`,
        [nom, role, contact, statut, id]
      );
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // DELETE /api/employers?id=X
  if (req.method === 'DELETE' && id) {
    try {
      await pool.query('DELETE FROM employers WHERE id=$1', [id]);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  res.status(405).end();
});
