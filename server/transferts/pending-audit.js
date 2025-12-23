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
module.exports = router;
