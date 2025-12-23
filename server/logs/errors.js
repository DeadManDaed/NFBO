// /server/logs/errors
const express = require('express');
const router = express.Router();
//const { validateAdmission } = require('../validators/validate'); 
const pool = require('../db');

const app = express();
app.post('/api/logs/errors', async (req, res) => {
    const { contexte, user, role, error_message, form_state } = req.body;
    
    try {
        await pool.query(
            `INSERT INTO logs_deploiement (contexte, utilisateur, role_utilisateur, message_erreur, etat_formulaire) 
             VALUES ($1, $2, $3, $4, $5)`,
            [contexte, user, role, error_message, JSON.stringify(form_state)]
        );
        res.status(201).json({ status: "Error logged successfully" });
    } catch (dbError) {
        console.error("Erreur critique : Impossible d'écrire dans la table de logs", dbError);
        res.status(500).send("Server Error");
    }
});
const router = express.Router();

module.exports = router;
