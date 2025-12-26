// server/routes/admissions.js
const express = require('express');
const router = express.Router();
const { validateAdmission } = require('../validators/validate'); 
const pool = require('../db');

// ✅ POST : Créer une admission
// J'ai laissé validateAdmission, assure-toi que ton schéma AJV accepte coef_qualite
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

        // Horodatage complet pour date_reception
        const date_actuelle = new Date().toISOString(); 

        // server/routes/admissions.js
const result = await pool.query(
    `INSERT INTO admissions (
        lot_id, producteur_id, quantite, unite, prix_ref, 
        coef_qualite, date_reception, date_expiration, 
        magasin_id, mode_paiement, utilisateur
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
        payload.lot_id,          // $1
        payload.producteur_id,   // $2
        payload.quantite,        // $3
        payload.unite,           // $4
        payload.prix_ref,        // $5 -> Très important pour le calcul de "estimee"
        payload.coef_qualite,    // $6 -> Très important pour le calcul de "estimee"
        payload.date_reception,  // $7
        payload.date_expiration, // $8
        payload.magasin_id,      // $9
        payload.mode_paiement,   // $10
        payload.utilisateur      // $11
    ]
);

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error('❌ Erreur SQL Admission:', err.message);
        // On renvoie un code 500 pour que le front sache que c'est une erreur serveur
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
