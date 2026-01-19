//server/routes/messages.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Ton pool pg

// 1. Charger la boîte de réception (GET /api/messages)
router.get('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 1; 

        // Avec pg, le résultat est dans res.rows
        const result = await db.query(
            `SELECT id, expediteur, objet, date, lu 
             FROM messages 
             WHERE destinataire_id = $1 
             ORDER BY date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Erreur SQL:", err.message);
        res.status(500).json({ error: "Erreur lors du chargement des messages" });
    }
});

// 2. Récupérer les destinataires (GET /api/messages/destinataires)
router.get('/destinataires', async (req, res) => {
    const { role, magasin_id } = req.query;
    try {
        let employesResult, producteursResult;

        if (role === 'superadmin') {
            employesResult = await db.query(
                "SELECT id, nom, role FROM employers WHERE statut = 'actif'"
            );
            producteursResult = await db.query(
                "SELECT id, nom_producteur FROM producteurs"
            );
        } else {
            // Utilisation des $1, $2 pour PostgreSQL
            employesResult = await db.query(
                `SELECT id, nom, role FROM employers 
                 WHERE (magasin_id = $1 OR role IN ('superadmin', 'auditeur')) 
                 AND statut = 'actif'`,
                [magasin_id]
            );
            
            producteursResult = await db.query(
                "SELECT id, nom_producteur FROM producteurs WHERE magasin_id = $1", 
                [magasin_id]
            );
        }

        res.json({ 
            employes: employesResult.rows, 
            producteurs: producteursResult.rows 
        });
    } catch (err) {
        console.error("Erreur Destinataires SQL:", err.message);
        res.status(500).json({ error: "Erreur récupération destinataires" });
    }
});

module.exports = router;
