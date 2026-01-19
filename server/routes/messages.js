const express = require('express');
const router = express.Router();
const db = require('../db'); // Assure-toi que ce chemin pointe vers ta connexion DB

// 1. Charger la boîte de réception (GET /api/messages)
router.get('/', async (req, res) => {
    try {
        // En production, utilise l'ID de la session : req.session.userId
        // Pour les tests, on peut simuler ou passer par un header
        const userId = req.headers['x-user-id'] || 1; 

        const [messages] = await db.query(
            `SELECT id, expediteur, objet, date, lu 
             FROM messages 
             WHERE destinataire_id = ? 
             ORDER BY date DESC`,
            [userId]
        );
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors du chargement des messages" });
    }
});

// 2. Lire un message spécifique (GET /api/messages/:id)
router.get('/:id', async (req, res) => {
    try {
        const [msg] = await db.query("SELECT * FROM messages WHERE id = ?", [req.params.id]);
        if (msg.length === 0) return res.status(404).json({ error: "Message non trouvé" });
        
        // Marquer comme lu
        await db.query("UPDATE messages SET lu = 1 WHERE id = ?", [req.params.id]);
        
        res.json(msg[0]);
    } catch (err) {
        res.status(500).json({ error: "Erreur de lecture" });
    }
});

// 3. Envoyer un message (POST /api/messages)
router.post('/', async (req, res) => {
    const { destinataire_id, objet, contenu, expediteur_id } = req.body;
    try {
        // On récupère le nom de l'expéditeur pour l'affichage rapide
        const [user] = await db.query("SELECT nom FROM employes WHERE id = ?", [expediteur_id]);
        const nomExpediteur = user[0] ? user[0].nom : "Système";

        await db.query(
            `INSERT INTO messages (expediteur_id, destinataire_id, expediteur, objet, contenu) 
             VALUES (?, ?, ?, ?, ?)`,
            [expediteur_id, destinataire_id, nomExpediteur, objet, contenu]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de l'envoi" });
    }
});

// 4. Récupérer les destinataires (GET /api/messages/destinataires)
// Note: J'ai ajusté le chemin pour qu'il soit cohérent avec l'appel JS
router.get('/destinataires', async (req, res) => {
    const { role, magasin_id } = req.query;
    try {
        let sqlEmployes, paramsEmployes = [];
        let sqlProducteurs, paramsProducteurs = [];

        if (role === 'superadmin') {
            sqlEmployes = "SELECT id, nom, role FROM employes WHERE statut = 'actif'";
            sqlProducteurs = "SELECT id, nom FROM producteurs";
        } else {
            // L'admin local voit ses collègues, les admins et les auditeurs
            sqlEmployes = `SELECT id, nom, role FROM employes 
                           WHERE (magasin_id = ? OR role IN ('superadmin', 'auditeur')) 
                           AND statut = 'actif'`;
            paramsEmployes = [magasin_id];
            
            sqlProducteurs = "SELECT id, nom FROM producteurs WHERE magasin_id = ?";
            paramsProducteurs = [magasin_id];
        }

        const [employes] = await db.query(sqlEmployes, paramsEmployes);
        const [producteurs] = await db.query(sqlProducteurs, paramsProducteurs);

        res.json({ employes, producteurs });
    } catch (err) {
        res.status(500).json({ error: "Erreur destinataires" });
    }
});

module.exports = router;
