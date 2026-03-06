// api/operations_caisse.js
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  const { type, limit = 50, producteur_id } = req.query;

  if (req.method === 'GET') {
    try {
      let query = `
        SELECT o.*, p.nom_producteur
        FROM operations_caisse o
        LEFT JOIN producteurs p ON p.id = o.producteur_id
        WHERE 1=1
      `;
      const params = [];
      if (type) { params.push(type); query += ` AND o.type_operation = $${params.length}`; }
      if (producteur_id) { params.push(producteur_id); query += ` AND o.producteur_id = $${params.length}`; }
      params.push(limit); query += ` ORDER BY o.date_operation DESC LIMIT $${params.length}`;
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { producteur_id, montant, type_operation, description, utilisateur, caisse_id } = req.body;
    if (!producteur_id || !montant || !type_operation) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    try {
      const result = await pool.query(
        `INSERT INTO operations_caisse 
         (producteur_id, montant, type_operation, description, utilisateur, caisse_id, date_operation)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
        [producteur_id, montant, type_operation, description, utilisateur, caisse_id || 1]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).end();
}));