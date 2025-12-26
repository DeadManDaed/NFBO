// server/routes/lots.js
const express = require('express');
const router = express.Router();
const { validateLotDefinition } = require('../validators/validate'); // ✅ Harmonisé
const pool = require('../db');

router.post('/', validateLot, async (req, res) => {
    const { categorie, description, prix_ref, unites_admises, criteres_admission, notes } = req.body;

    try {
        const query = `
            INSERT INTO lots (categorie, description, prix_ref, unites_admises, criteres_admission, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        
        // Note : On stocke les tableaux et objets au format JSONB si vous utilisez PostgreSQL
        const values = [
            categorie, 
            description, 
            prix_ref, 
            JSON.stringify(unites_admises), 
            JSON.stringify(criteres_admission), 
            notes
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la sauvegarde en base de données');
    }
});
router.get('/', async (req, res) => {
    try {
        console.log("Accès GET /api/lots");
        // Plus simple : on récupère tout directement depuis 'lots'
        const query = `
            SELECT * FROM lots 
            ORDER BY date_creation DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows); 
    } catch (err) {
        console.error('Erreur GET /api/lots:', err);
        res.status(500).json({ message: 'Erreur lors de la récupération des lots' });
    }
});

// Modifier un lot : PUT /api/lots/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { description, categorie, prix_ref, unites_admises, criteres_admission } = req.body;

        const result = await pool.query(
            `UPDATE lots 
             SET description = $1, 
                 categorie = $2, 
                 prix_ref = $3, 
                 unites_admises = $4, 
                 criteres_admission = $5
             WHERE id = $6 RETURNING *`,
            [
                description,
                categorie,
                prix_ref || 0,
                JSON.stringify(unites_admises || []),
                JSON.stringify(criteres_admission || []),
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Lot non trouvé" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erreur UPDATE /api/lots:', err);
        res.status(500).json({ message: 'Erreur lors de la modification' });
    }
});

// Supprimer un lot : DELETE /api/lots/:id
router.get('/:id', async (req, res) => { // Correction : utilisez router.delete en production
    // Note : Pour tester rapidement via un navigateur, on utilise parfois GET, 
    // mais la norme est router.delete
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM lots WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Lot non trouvé" });
        }

        res.json({ message: "Lot supprimé avec succès", lot: result.rows[0] });
    } catch (err) {
        console.error('Erreur DELETE /api/lots:', err);
        // Si le lot est utilisé ailleurs, err.code sera '23503'
        res.status(500).json({ message: 'Impossible de supprimer ce lot (il est peut-être utilisé dans des admissions)' });
    }
});

// ... gardez vos routes GET, PUT et DELETE ...
module.exports = router;









