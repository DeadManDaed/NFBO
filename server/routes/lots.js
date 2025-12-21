// server/routes/lots.js
const express = require('express');
const router = express.Router();
const { validateLotDefinition } = require('../validators/validate'); // ✅ Harmonisé
const pool = require('../db');

router.post('/', validateLotDefinition, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertText = `
      INSERT INTO lots (
        description, categorie, criteres_admission, unites_admises, prix_ref, stock_disponible
      ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    
    const vals = [
      req.body.description,
      req.body.categorie,
      JSON.stringify(req.body.criteres_admission || []), // ✅ Convertit en chaîne JSON valide
  JSON.stringify(req.body.unites_admises || []),    // ✅ Convertit en chaîne JSON valide
      req.body.prix_ref || 0,
      req.body.stock_disponible || 0
    ];
    
    const result = await client.query(insertText, vals);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/lots error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ... gardez vos routes GET, PUT et DELETE ...
module.exports = router;


