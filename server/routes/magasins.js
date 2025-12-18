// /server/magasins.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // ta connexion Render

// Liste des magasins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nom, region_id, code FROM magasins ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d’un magasin
router.post('/', async (req, res) => {
  const { nom, region_id, code } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO magasins (nom, region_id, code) VALUES ($1, $2, $3) RETURNING *',
      [nom, region_id, code]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modification
router.put('/:id', async (req, res) => {
  const { nom, region_id, code } = req.body;
  try {
    const result = await pool.query(
      'UPDATE magasins SET nom=$1, region_id=$2, code=$3 WHERE id=$4 RETURNING *',
      [nom, region_id, code, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Suppression
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM magasins WHERE id=$1', [req.params.id]);
    res.json({ message: 'Magasin supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
