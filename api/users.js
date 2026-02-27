// api/users.js  →  /api/users et /api/users?id=X
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  const { id, magasin_id } = req.query;

  // GET /api/users
  if (req.method === 'GET') {
    try {
      let query = 'SELECT id, username, role, prenom, nom, email, telephone, magasin_id, statut FROM users';
      let params = [];
      if (magasin_id) {
        query += ' WHERE magasin_id=$1';
        params.push(magasin_id);
      }
      query += ' ORDER BY id DESC';
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
  }

  // POST /api/users
  if (req.method === 'POST') {
    const { username, password, role, prenom, nom, email, telephone, magasin_id: mg, statut } = req.body;
    try {
      const check = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
      if (check.rows.length > 0) return res.status(400).json({ error: "Ce nom d'utilisateur existe déjà" });

      const result = await pool.query(
        `INSERT INTO users (username, password_hash, role, prenom, nom, email, telephone, magasin_id, statut)
         VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, username, role, prenom, nom, email, telephone, magasin_id, statut`,
        [username, password, role, prenom, nom, email, telephone, mg, statut || 'actif']
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(400).json({ error: 'Username ou Email déjà utilisé' });
      return res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
  }

  // PUT /api/users?id=X
  if (req.method === 'PUT' && id) {
    const { prenom, nom, email, role, telephone, statut, magasin_id: mg } = req.body;
    try {
      const result = await pool.query(
        `UPDATE users SET prenom=$1, nom=$2, email=$3, role=$4, telephone=$5, statut=$6, magasin_id=$7
         WHERE id=$8 RETURNING id, username, role, statut`,
        [prenom, nom, email, role, telephone, statut, mg, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }

  // DELETE /api/users?id=X
  if (req.method === 'DELETE' && id) {
    try {
      const result = await pool.query('DELETE FROM users WHERE id=$1 RETURNING username', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
      return res.json({ success: true, message: `Utilisateur ${result.rows[0].username} supprimé` });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
    }
  }

  res.status(405).end();
});
