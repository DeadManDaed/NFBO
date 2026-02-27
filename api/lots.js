// api/lots.js  →  /api/lots et /api/lots?id=X
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  const { id } = req.query;

  // GET /api/lots
  if (req.method === 'GET' && !id) {
    try {
      const result = await pool.query('SELECT * FROM lots ORDER BY date_creation DESC');
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ message: 'Erreur lors de la récupération des lots' });
    }
  }

  // GET /api/lots?id=X
  if (req.method === 'GET' && id) {
    try {
      const result = await pool.query('SELECT * FROM lots WHERE id=$1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Lot non trouvé' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: "Erreur lors de l'extraction du lot" });
    }
  }

  // POST /api/lots
  if (req.method === 'POST') {
    const { categorie, description, prix_ref, unites_admises, criteres_admission, notes } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO lots (categorie, description, prix_ref, unites_admises, criteres_admission, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [categorie, description, prix_ref, JSON.stringify(unites_admises), JSON.stringify(criteres_admission), notes]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
    }
  }

  // PUT /api/lots?id=X
  if (req.method === 'PUT' && id) {
    const { description, categorie, prix_ref, unites_admises, criteres_admission } = req.body;
    try {
      const result = await pool.query(
        `UPDATE lots SET description=$1, categorie=$2, prix_ref=$3, unites_admises=$4, criteres_admission=$5
         WHERE id=$6 RETURNING *`,
        [description, categorie, prix_ref || 0, JSON.stringify(unites_admises || []), JSON.stringify(criteres_admission || []), id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Lot non trouvé' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ message: 'Erreur lors de la modification' });
    }
  }

  // DELETE /api/lots?id=X
  if (req.method === 'DELETE' && id) {
    try {
      const result = await pool.query('DELETE FROM lots WHERE id=$1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Lot non trouvé' });
      return res.json({ message: 'Lot supprimé avec succès', lot: result.rows[0] });
    } catch (err) {
      return res.status(500).json({ message: 'Impossible de supprimer ce lot (utilisé dans des admissions)' });
    }
  }

  res.status(405).end();
});
