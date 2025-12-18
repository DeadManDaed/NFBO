// server/routes/lots.js
const express = require('express');
const router = express.Router();
const { validateLot } = require('../validators/validate');
const pool = require('../db');

// --- Routes métier ---
// Création d’un lot (catégorie)
router.post('/', validateLot, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insérer le lot (schéma réel de public.lots)
    const insertText = `
      INSERT INTO lots (
        description, categorie, criteres_admission, unites_admises, prix_ref, stock_disponible
      ) VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const vals = [
      req.body.description,
      req.body.categorie,
      req.body.criteres_admission || [],
      req.body.unites_admises || [],
      req.body.prix_ref || 0,
      req.body.stock_disponible || 0
    ];
    const insertRes = await client.query(insertText, vals);

    await client.query('COMMIT');
    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('POST /api/lots error', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// --- Routes CRUD ---
// GET tous les lots
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lots ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET un lot par ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lots WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lot introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT mise à jour
router.put('/:id', async (req, res) => {
  const { description, categorie, criteres_admission, unites_admises, prix_ref, stock_disponible } = req.body;
  try {
    const result = await pool.query(
      `UPDATE lots SET description=$1, categorie=$2, criteres_admission=$3, unites_admises=$4, prix_ref=$5, stock_disponible=$6 
       WHERE id=$7 RETURNING *`,
      [description, categorie, criteres_admission, unites_admises, prix_ref, stock_disponible, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lot introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Erreur mise à jour lot' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lots WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lot introuvable' });
    res.json({ message: 'Lot supprimé', lot: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression lot' });
  }
});

module.exports = router;
