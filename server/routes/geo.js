// geo.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET toutes les régions
/*
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

module.exports = router;*/



router.get('/api/regions', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nom FROM regions ORDER BY nom');
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur /api/regions:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/departements?region_id=X
router.get('/api/departements', async (req, res) => {
    const { region_id } = req.query;
    
    try {
        let query = 'SELECT id, nom, region_id FROM departements';
        let params = [];
        
        if (region_id) {
            query += ' WHERE region_id = $1';
            params.push(region_id);
        }
        
        query += ' ORDER BY nom';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur /api/departements:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/arrondissements?departement_id=X
router.get('/api/arrondissements', async (req, res) => {
    const { departement_id } = req.query;
    
    try {
        let query = 'SELECT id, nom, departement_id, code FROM arrondissements';
        let params = [];
        
        if (departement_id) {
            query += ' WHERE departement_id = $1';
            params.push(departement_id);
        }
        
        query += ' ORDER BY nom';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erreur /api/arrondissements:', err.message);
        res.status(500).json({ error: err.message });
    }
});
