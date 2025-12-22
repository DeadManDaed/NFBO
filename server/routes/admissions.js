// server/routes/admissions.js
const express = require('express');
const router = express.Router();
const { validateAdmission } = require('../validators/validate'); 
const pool = require('../db');

router.post('/', validateAdmission, async (req, res) => {
  const {
    lot_id, producteur_id, quantite, unite, prix_unitaire, 
    qualite, // Reçoit "A", "B", etc.
    date_expiration, magasin_id
  } = req.body;

  // Conversion de la lettre vers le chiffre attendu par le type NUMERIC de la DB
  const mapQualite = { 'A': 1.0, 'B': 0.9, 'C': 0.85, 'D': 0.7 };
  const coefNumerique = mapQualite[qualite] || 1.0;

  try {
    const result = await pool.query(
      `INSERT INTO admissions (
        lot_id, producteur_id, quantite, unite, prix_ref, coef_qualite,
        date_reception, date_expiration, magasin_id, utilisateur
      ) VALUES ($1,$2,$3,$4,$5,$6, NOW(), $7, $8, $9) RETURNING *`,
      [
        parseInt(lot_id), 
        producteur_id, 
        parseFloat(quantite), 
        unite, 
        parseFloat(prix_unitaire || 0), 
        coefNumerique, // Envoi du nombre
        date_expiration || null, 
        magasin_id, 
        req.body.utilisateur || 'admin'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur SQL:', err.message);
    res.status(400).json({ error: 'Erreur SQL', details: err.message });
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
