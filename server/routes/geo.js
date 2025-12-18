// geo.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET toutes les régions
router.get('/regions', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nom FROM regions ORDER BY nom');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur chargement régions' });
  }
});

// GET départements par région
router.get('/departements', async (req, res) => {
  const { region_id } = req.query;
  try {
    const result = await pool.query(
      'SELECT id, nom FROM departements WHERE region_id = $1 ORDER BY nom',
      [region_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur chargement départements' });
  }
});

// GET arrondissements par département
router.get('/arrondissements', async (req, res) => {
  const { departement_id } = req.query;
  try {
    const result = await pool.query(
      'SELECT id, nom FROM arrondissements WHERE departement_id = $1 ORDER BY nom',
      [departement_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur chargement arrondissements' });
  }
});

module.exports = router;
