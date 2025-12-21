// server/routes/admissions.js
const express = require('express');
const router = express.Router();
const { validateAdmission } = require('../validators/validate'); // ✅ Ajouté
const pool = require('../db');

router.get('/', async (req, res) => { /* ... existant ... */ });

router.post('/', validateAdmission, async (req, res) => { // ✅ Validateur actif
  const {
    lot_id, producteur_id, quantite, unite, prix_ref,
    coef_qualite, date_reception, date_expiration, magasin_id, utilisateur
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO admissions (
        lot_id, producteur_id, quantite, unite, prix_ref, coef_qualite,
        date_reception, date_expiration, magasin_id, utilisateur
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [lot_id, producteur_id, quantite, unite, prix_ref, coef_qualite, 
       date_reception, date_expiration, magasin_id, utilisateur]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST admissions', err);
    res.status(400).json({ error: 'Erreur lors de la création de l’admission' });
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
