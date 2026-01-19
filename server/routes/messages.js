const express = require('express');
const router = express.Router();
const db = require('../db'); 

// 1. Charger la boîte de réception
router.get('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 1; 
        const result = await db.query(
            `SELECT id, expediteur, objet, date, lu 
             FROM messages WHERE destinataire_id = $1 
             ORDER BY date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur chargement messages" });
    }
});

// 2. ENVOYER un message (Route ajoutée)
router.post('/', async (req, res) => {
    const { destinataire_id, objet, contenu } = req.body;
    // On récupère l'ID de l'expéditeur depuis le header ou la session
    const expediteur_id = req.headers['x-user-id'] || 1; 

    try {
        // Récupérer le nom de l'expéditeur pour l'historique
        const userRes = await db.query("SELECT nom FROM employers WHERE id = $1", [expediteur_id]);
        const nomExp = userRes.rows[0] ? userRes.rows[0].nom : "Système";

        await db.query(
            `INSERT INTO messages (expediteur_id, destinataire_id, expediteur, objet, contenu) 
             VALUES ($1, $2, $3, $4, $5)`,
            [expediteur_id, destinataire_id, nomExp, objet, contenu]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Échec de l'envoi" });
    }
});

// 3. Destinataires filtrés
router.get('/destinataires', async (req, res) => {
    const { role, magasin_id } = req.query;
    try {
        let empRes, prodRes;
        if (role === 'superadmin') {
            empRes = await db.query("SELECT id, nom, role FROM employers WHERE statut = 'actif'");
            prodRes = await db.query("SELECT id, nom_producteur as nom FROM producteurs");
        } else {
            empRes = await db.query(
                `SELECT id, nom, role FROM employers 
                 WHERE (magasin_id = $1 OR role IN ('superadmin', 'auditeur')) AND statut = 'actif'`,
                [magasin_id]
            );
            prodRes = await db.query("SELECT id, nom_producteur as nom FROM producteurs WHERE magasin_id = $1", [magasin_id]);
        }
        res.json({ employers: empRes.rows, producteurs: prodRes.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Lire un message (Détail)
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM messages WHERE id = $1", [req.params.id]);
        await db.query("UPDATE messages SET lu = TRUE WHERE id = $1", [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erreur lecture" });
    }
});

module.exports = router;
