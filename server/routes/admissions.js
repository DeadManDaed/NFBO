// server/routes/admissions.js
const express = require('express');
const router = express.Router();
const { validateAdmission } = require('../validators/validate'); 
const pool = require('../db');

router.get('/', async (req, res) => { /* ... existant ... */ });

router.post('/', validateAdmission, async (req, res) => { 
  // On récupère exactement ce que le front envoie (notez 'prix_unitaire' au lieu de 'prix_ref')
  const {
    lot_id, 
    producteur_id, // Sera reçu comme un String (ex: "PRD-2025-001")
    quantite, 
    unite, 
    prix_unitaire, 
    qualite, // On renomme pour correspondre au front (coef_qualite dans la DB)
    date_expiration, 
    magasin_id
  } = req.body;

  // On définit l'utilisateur par défaut ou via la session si disponible
  const utilisateur = req.body.utilisateur || 'admin';
  const date_reception = new Date(); // Date automatique si non fournie

  try {
    const result = await pool.query(
      `INSERT INTO admissions (
        lot_id, producteur_id, quantite, unite, prix_ref, coef_qualite,
        date_reception, date_expiration, magasin_id, utilisateur
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        parseInt(lot_id), // S'assurer que l'ID du lot est un entier
        producteur_id,    // Envoyé tel quel car c'est un String auto-généré
        parseFloat(quantite), 
        unite, 
        parseFloat(prix_unitaire || 0), 
        qualite, 
        date_reception, 
        date_expiration || null, 
        magasin_id, 
        utilisateur
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST admissions', err);
    // On renvoie l'erreur détaillée pour vous aider à déboguer sur Render
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
