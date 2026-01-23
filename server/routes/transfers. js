//server/routes/transferts.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Assurez-vous que le chemin vers db.js est correct

// POST /api/transferts - Créer un nouveau transfert
router.post('/', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { 
            lot_id, 
            quantite, 
            unite, 
            magasin_id, // Source
            destination_magasin_id, // Destination
            chauffeur_id,
            prix_ref,
            utilisateur,
            motif 
        } = req.body;

        // Validation basique
        if (!lot_id || !quantite || !magasin_id || !destination_magasin_id) {
            return res.status(400).json({ error: "Données incomplètes (lot, quantité, source ou destination manquants)" });
        }

        await client.query('BEGIN'); // Début de la transaction

        // 1. Vérifier le stock dans le magasin de DÉPART
        const checkStock = await client.query(
            `SELECT stock_actuel FROM stocks 
             WHERE lot_id = $1 AND magasin_id = $2 
             FOR UPDATE`, // Verrouille la ligne pour éviter les conflits
            [lot_id, magasin_id]
        );

        if (checkStock.rows.length === 0) {
            throw new Error("Ce lot n'existe pas dans le magasin source.");
        }

        const stockDispo = parseFloat(checkStock.rows[0].stock_actuel);
        if (stockDispo < parseFloat(quantite)) {
            throw new Error(`Stock insuffisant. Disponible: ${stockDispo}, Demandé: ${quantite}`);
        }

        // 2. Débiter le stock du magasin de DÉPART
        // Note: On ne crédite PAS encore l'arrivée. Le stock est "dans le camion" (en transit).
        await client.query(
            `UPDATE stocks 
             SET stock_actuel = stock_actuel - $1 
             WHERE lot_id = $2 AND magasin_id = $3`,
            [quantite, lot_id, magasin_id]
        );

        // 3. Créer l'enregistrement de transfert
        const insertTransfert = await client.query(
            `INSERT INTO transferts 
            (lot_id, magasin_depart, magasin_destination, chauffeur_id, quantite, unite, prix_ref, utilisateur, motif, statut)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'en_transit')
            RETURNING id`,
            [lot_id, magasin_id, destination_magasin_id, chauffeur_id || null, quantite, unite, prix_ref, utilisateur, motif]
        );

        await client.query('COMMIT'); // Valider la transaction

        res.status(201).json({ 
            message: "Transfert initié avec succès", 
            transfert_id: insertTransfert.rows[0].id 
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Annuler en cas d'erreur
        console.error('Erreur transfert:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
