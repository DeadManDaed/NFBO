const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/disponible/:magasinId', async (req, res) => {
    try {
        const { magasinId } = req.params;

        // La requête est enfermée entre des backticks (`) pour être une chaîne de caractères
        const query = `
            SELECT 
                a.lot_id, 
                l.description, 
                MAX(a.unite) as unite,
                SUM(a.quantite) - COALESCE((
                    SELECT SUM(r.quantite) 
                    FROM retraits r 
                    WHERE r.lot_id = a.lot_id AND r.magasin_id = a.magasin_id
                ), 0) as stock_actuel
            FROM admissions a
            JOIN lots l ON a.lot_id = l.id
            WHERE a.magasin_id = $1
            GROUP BY a.lot_id, l.description
            HAVING (SUM(a.quantite) - COALESCE((
                SELECT SUM(r.quantite) 
                FROM retraits r 
                WHERE r.lot_id = a.lot_id AND r.magasin_id = a.magasin_id
            ), 0)) > 0;
        `;

        const result = await pool.query(query, [magasinId]); 
        res.json(result.rows);
    } catch (err) {
        console.error('Erreur SQL Stock:', err);
        res.status(500).json({ error: "Erreur serveur lors de la récupération du stock" });
    }
});

module.exports = router;
