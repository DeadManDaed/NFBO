// server/routes/admissions.js
const express = require('express');
const router = express.Router();
const { validateAdmission } = require('../validators/validate'); 
const pool = require('../db');

// ✅ POST : Créer une admission
router.post('/', validateAdmission, async (req, res) => {
    try {
        const {
            lot_id, 
            producteur_id, 
            quantite, 
            unite, 
            prix_ref, 
            coef_qualite, 
            date_expiration, 
            magasin_id, 
            mode_paiement, 
            utilisateur
        } = req.body;

        const date_reception = new Date().toISOString(); 

        const result = await pool.query(
            `INSERT INTO admissions (
                lot_id, producteur_id, quantite, unite, prix_ref, 
                coef_qualite, date_reception, date_expiration, 
                magasin_id, mode_paiement, utilisateur
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                parseInt(lot_id),        // $1
                parseInt(producteur_id), // $2
                parseFloat(quantite),    // $3
                unite,                   // $4
                parseFloat(prix_ref),    // $5
                parseFloat(coef_qualite),// $6
                date_reception,          // $7
                date_expiration || null, // $8
                parseInt(magasin_id),    // $9
                mode_paiement,           // $10
                utilisateur              // $11
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error('❌ Erreur SQL Admission:', err.message);
        res.status(500).json({ error: 'Erreur SQL', details: err.message });
    }
});

// ✅ DELETE : Supprimer une admission
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM admissions WHERE id=$1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admission introuvable' });
        }
        res.json({ message: 'Admission supprimée', admission: result.rows[0] });
    } catch (err) {
        console.error('Erreur DELETE admissions:', err);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

module.exports = router;
