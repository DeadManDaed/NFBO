// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET tous les utilisateurs d’un magasin
router.get('/magasin/:magasinId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nom, email, role FROM users WHERE magasin_id=$1',
      [req.params.magasinId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST nouvel utilisateur
router.post('/', async (req, res) => {
  const { magasin_id, nom, email, role } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO users (magasin_id, nom, email, role)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [magasin_id, nom, email, role]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT mise à jour
router.put('/:id', async (req, res) => {
  const { nom, email, role } = req.body;
  try {
    const result = await db.query(
      `UPDATE users SET nom=$1, email=$2, role=$3 WHERE id=$4 RETURNING *`,
      [nom, email, role, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
