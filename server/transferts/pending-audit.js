const express = require('express');
const router = express.Router();

// Endpoint pour l'Auditeur : Récupérer les transferts en attente de validation finale
router.get('/pending-audit', async (req, res) => {
    // Sécurité : Seul un Auditeur ou Superadmin peut appeler cette route
    if (req.user.role !== 'auditeur' && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Accès refusé" });
    }

    try {
        const query = `
            SELECT t.*, 
                   m1.nom_magasin as provenance, 
                   m2.nom_magasin as destination,
                   l.description as produit_nom
            FROM transferts_urgence t
            JOIN magasins m1 ON t.magasin_id_depart = m1.id
            JOIN magasins m2 ON t.magasin_id_dest = m2.id
            JOIN lots l ON t.lot_id = l.id
            WHERE t.statut = 'WAITING_AUDIT' 
              AND t.admin_local_depart_ok = TRUE 
              AND t.admin_local_dest_ok = TRUE;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        logDeploymentError('API-Pending-Audit-Fetch', err);
        res.status(500).send("Erreur serveur");
    }
});
// Route pour approuver localement (Départ ou Destination)
router.post('/local-approve/:id', async (req, res) => {
    const { id } = req.params;
    const { magasin_id } = req.body;

    try {
        // On vérifie si le magasin est l'expéditeur ou le destinataire pour cocher le bon drapeau
        const query = `
            UPDATE transferts_urgence 
            SET 
                admin_local_depart_ok = CASE WHEN magasin_id_depart = $1 THEN TRUE ELSE admin_local_depart_ok END,
                admin_local_dest_ok = CASE WHEN magasin_id_dest = $1 THEN TRUE ELSE admin_local_dest_ok END,
                statut = CASE 
                    WHEN (magasin_id_depart = $1 AND admin_local_dest_ok = TRUE) OR (magasin_id_dest = $1 AND admin_local_depart_ok = TRUE) 
                    THEN 'WAITING_AUDIT' 
                    ELSE statut 
                END
            WHERE id = $2
            RETURNING *;
        `;
        
        const result = await pool.query(query, [magasin_id, id]);
        res.json(result.rows[0]);
    } catch (err) {
        logDeploymentError('DB-Local-Approve-Update', err);
        res.status(500).send("Erreur lors de la mise à jour.");
    }
});
// Validation finale par l'Auditeur
router.post('/final-approve/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(
            `UPDATE transferts_urgence 
             SET audit_final_ok = TRUE, statut = 'APPROVED' 
             WHERE id = $1 AND admin_local_depart_ok = TRUE AND admin_local_dest_ok = TRUE
             RETURNING *`, [id]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ error: "Les validations locales manquent encore." });
        }

        res.json({ message: "Transfert validé et stock mis à jour.", data: result.rows[0] });
    } catch (err) {
        // On utilise notre logger pour l'analyse future
        logDeploymentError('Final-Approve-Fail', err);
        res.status(500).send("Erreur serveur");
    }
});
module.exports = router;
