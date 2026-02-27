// server/routes/employers.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // module de connexion PostgreSQL

// À placer AVANT la route /magasin/:magasinId
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ' + (req.baseUrl.includes('users') ? 'users' : 'employers') + ' ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET tous les employés d’un magasin
router.get('/magasin/:magasinId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nom, role, contact, date_embauche, statut FROM employers WHERE magasin_id=$1',
      [req.params.magasinId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { magasin_id } = req.query;
    
    let query = 'SELECT * FROM employers';
    let params = [];
    
    if (magasin_id) {
      query += ' WHERE magasin_id = $1';
      params.push(magasin_id);
    }
    
    query += ' ORDER BY nom';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET employers:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST nouvel employé
router.post('/', async (req, res) => {
  const { magasin_id, nom, role, contact, date_embauche } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO employers (magasin_id, nom, role, contact, date_embauche)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [magasin_id, nom, role, contact, date_embauche]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT mise à jour d’un employé
router.put('/:id', async (req, res) => {
  const { nom, role, contact, statut } = req.body;
  try {
    const result = await db.query(
      `UPDATE employers SET nom=$1, role=$2, contact=$3, statut=$4 WHERE id=$5 RETURNING *`,
      [nom, role, contact, statut, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE suppression d’un employé
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
