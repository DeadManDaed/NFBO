// server/routes/producteurs.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // connexion PostgreSQL

// ✅ GET : liste des producteurs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM producteurs ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET producteurs', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET : un producteur par ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM producteurs WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producteur introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur GET producteur', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST : ajouter un producteur
router.post('/', async (req, res) => {
  const {
    nom_producteur,
    tel_producteur,
    type_producteur,
    carte_membre,
    points_fidelite,
    solde,
    statut,
    region_id,
    departement_id,
    arrondissement_id,
    localite
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO producteurs 
       (nom_producteur, tel_producteur, type_producteur, carte_membre, points_fidelite, solde, statut, region_id, departement_id, arrondissement_id, localite)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        nom_producteur,
        tel_producteur,
        type_producteur,
        carte_membre || false,
        points_fidelite || 0,
        solde || 0,
        statut || 'en_attente',
        region_id || null,
        departement_id || null,
        arrondissement_id || null,
        localite || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST producteurs', err);
    res.status(400).json({ error: 'Erreur lors de l’ajout du producteur' });
  }
});

// ✅ PUT : mise à jour d’un producteur
router.put('/:id', async (req, res) => {
  const {
    nom_producteur,
    tel_producteur,
    type_producteur,
    carte_membre,
    points_fidelite,
    solde,
    statut,
    region_id,
    departement_id,
    arrondissement_id,
    localite
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE producteurs SET
        nom_producteur = $1,
        tel_producteur = $2,
        type_producteur = $3,
        carte_membre = $4,
        points_fidelite = $5,
        solde = $6,
        statut = $7,
        region_id = $8,
        departement_id = $9,
        arrondissement_id = $10,
        localite = $11
       WHERE id = $12
       RETURNING *`,
      [
        nom_producteur,
        tel_producteur,
        type_producteur,
        carte_membre,
        points_fidelite,
        solde,
        statut,
        region_id,
        departement_id,
        arrondissement_id,
        localite,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producteur introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur PUT producteurs', err);
    res.status(400).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ✅ DELETE : suppression d’un producteur
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM producteurs WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producteur introuvable' });
    }
    res.json({ message: 'Producteur supprimé', producteur: result.rows[0] });
  } catch (err) {
    console.error('Erreur DELETE producteurs', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
