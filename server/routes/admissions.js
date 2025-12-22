// server/routes/admissions.js
const express = require('express');
const router = express.Router();
const { validateAdmission } = require('../validators/validate'); 
const pool = require('../db');

router.post('/', validateAdmission, async (req, res) => { 
  const {
    lot_id, producteur_id, quantite, unite, prix_unitaire, 
    qualite, // Contient "A", "B", etc.
    date_expiration, magasin_id
  } = req.body;

  // 1. Transformation de la lettre en coefficient numérique
  const coeffs = {
    'A': 1.0,
    'B': 0.9,
    'C': 0.85,
    'D': 0.7
  };
  const valeurCoefficient = coeffs[qualite] || 1.0; // Par défaut 1.0 si erreur

  const utilisateur = req.body.utilisateur || 'admin';
  const date_reception = new Date();

  try {
    const result = await pool.query(
      `INSERT INTO admissions (
        lot_id, producteur_id, quantite, unite, prix_ref, coef_qualite,
        date_reception, date_expiration, magasin_id, utilisateur
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        parseInt(lot_id), 
        producteur_id, 
        parseFloat(quantite), 
        unite, 
        parseFloat(prix_unitaire || 0), 
        valeurCoefficient, // On envoie le CHIFFRE (1.0) et non la LETTRE ("A")
        date_reception, 
        date_expiration || null, 
        magasin_id, 
        utilisateur
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST admissions', err);
    res.status(400).json({ 
        error: 'Erreur lors de la création de l’admission',
        details: err.message 
    });
  }
});

// ✅ DELETE : supprimer une admission
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM admissions WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admission introuvable' });
    res.json({ message: 'Admission supprimée', admission: result.rows[0] });
  } catch (err) {
    console.error('Erreur DELETE admissions', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
