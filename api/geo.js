// api/geo.js  →  /api/geo?type=regions|departements|arrondissements
// On unifie les 3 endpoints géo dans un seul fichier
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();

  const { type, region_id, departement_id } = req.query;

  try {
    if (type === 'regions' || !type) {
      const result = await pool.query('SELECT id, nom FROM regions ORDER BY nom');
      return res.json(result.rows);
    }

    if (type === 'departements') {
      let query = 'SELECT id, nom, region_id FROM departements';
      let params = [];
      if (region_id) { query += ' WHERE region_id=$1'; params.push(region_id); }
      query += ' ORDER BY nom';
      const result = await pool.query(query, params);
      return res.json(result.rows);
    }

    if (type === 'arrondissements') {
      let query = 'SELECT id, nom, departement_id, code FROM arrondissements';
      let params = [];
      if (departement_id) { query += ' WHERE departement_id=$1'; params.push(departement_id); }
      query += ' ORDER BY nom';
      const result = await pool.query(query, params);
      return res.json(result.rows);
    }

    return res.status(400).json({ error: 'type requis : regions | departements | arrondissements' });

  } catch (err) {
    console.error('Erreur geo:', err.message);
    return res.status(500).json({ error: err.message });
  }
});
