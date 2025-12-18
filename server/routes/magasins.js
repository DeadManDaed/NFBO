// /server/routes/magasins.js
const express = require('express');
const router = express.Router();
const pool = require('./db'); // connexion Render

// 🔹 GET : liste des magasins avec nom de la région
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.nom, m.code, m.region_id, r.nom AS region
      FROM magasins m
      LEFT JOIN regions r ON m.region_id = r.id
      ORDER BY m.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET /magasins:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔹 POST : création d’un magasin
router.post('/', async (req, res) => {
  const { nom, region_id, code } = req.body;
  try {
    // Vérifier que la région existe
    if (region_id) {
      const checkRegion = await pool.query('SELECT id FROM regions WHERE id=$1', [region_id]);
      if (checkRegion.rowCount === 0) {
        return res.status(400).json({ error: 'Region inexistante' });
      }
    }

    const result = await pool.query(
      'INSERT INTO magasins (nom, region_id, code) VALUES ($1, $2, $3) RETURNING *',
      [nom, region_id, code]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST /magasins:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔹 PUT : modification d’un magasin
router.put('/:id', async (req, res) => {
  const { nom, region_id, code } = req.body;
  try {
    if (region_id) {
      const checkRegion = await pool.query('SELECT id FROM regions WHERE id=$1', [region_id]);
      if (checkRegion.rowCount === 0) {
        return res.status(400).json({ error: 'Region inexistante' });
      }
    }

    const result = await pool.query(
      'UPDATE magasins SET nom=$1, region_id=$2, code=$3 WHERE id=$4 RETURNING *',
      [nom, region_id, code, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Magasin introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur PUT /magasins:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔹 DELETE : suppression d’un magasin
router.delete('/:id', async (req, res) => {
  try {
    // ⚠️ Attention : cascade sur admissions, retraits, employers
    await pool.query('DELETE FROM magasins WHERE id=$1', [req.params.id]);
    res.json({ message: 'Magasin supprimé (⚠️ admissions, retraits, employés liés supprimés automatiquement)' });
  } catch (err) {
    console.error('Erreur DELETE /magasins:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
