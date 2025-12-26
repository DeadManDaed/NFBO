// server/routes/admissions.js
const express = require('express');
const router = express.Router();
const { validateAdmission } = require('../validators/validate'); 
const pool = require('../db');

router.post('/', validateAdmission, async (req, res) => {
  const {
    lot_id, 
    producteur_id, 
    quantite, 
    unite, 
    prix_ref,       // Aligné sur le payload
    //grade_qualite,  // Aligné sur le payload ("A", "B"...)
    date_expiration, 
    magasin_id,
    mode_paiement,  // Nouveau : pour gérer le 7% MM
    utilisateur
  } = req.body;

  // Correspondance pour le coefficient numérique
  /*const mapQualite = { 'A': 1.0, 'B': 0.9, 'C': 0.8, 'D': 0.7 };
  const coefNumerique = mapQualite[grade_qualite] || 1.0;*/

  try {
   router.post('/', async (req, res) => {
  try {
    const {
      lot_id, producteur_id, quantite, unite, 
      prix_ref, coef_qualite, date_expiration, 
      magasin_id, mode_paiement, utilisateur
    } = req.body;

    // On crée l'horodatage précis ici
    const date_actuelle = new Date().toISOString(); 

    const result = await pool.query(
      `INSERT INTO admissions (
        lot_id, producteur_id, quantite, unite, prix_ref, 
        coef_qualite, date_reception, date_expiration, 
        magasin_id, mode_paiement, utilisateur
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        parseInt(lot_id),
        parseInt(producteur_id),
        parseFloat(quantite),
        unite,
        parseFloat(prix_ref || 0),
        parseFloat(coef_qualite || 1),
        date_actuelle, // <-- Date et heure envoyées ici
        date_expiration || null,
        parseInt(magasin_id),
        mode_paiement || 'solde',
        utilisateur || 'agent_system'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur SQL:', err.message);
    res.status(500).json({ error: err.message });
  }
});
  }
/*    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Erreur SQL Admission:', err.message);
    res.status(400).json({ error: 'Erreur SQL', details: err.message });
  }
});*/

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
