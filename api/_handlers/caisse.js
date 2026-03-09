// api/_handlers/caisse.js

const pool            = require('../_lib/db');
const { withCors }    = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

const ROLES_AUTORISES = ['superadmin', 'admin', 'gestionnaire', 'auditeur'];
const MAGASIN_VIRTUEL = 21;

module.exports = withCors(requireAuth(async (req, res) => {
  if (!ROLES_AUTORISES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const { action, magasin_id, caisse_id } = req.query;
  const userId    = String(req.user.id);
  const userRole  = req.user.role;
  const userMagasin = req.user.magasin_id;
  const isGlobal  = userRole === 'superadmin' || userRole === 'auditeur';

  // ── GET ?action=liste ─────────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'liste') {
    try {
      let query, params = [];
      if (isGlobal) {
        query = `
          SELECT c.*, m.nom AS magasin_nom
          FROM caisse c
          LEFT JOIN magasins m ON m.id = c.magasin_id
          ORDER BY m.nom
        `;
      } else {
        query = `
          SELECT c.*, m.nom AS magasin_nom
          FROM caisse c
          LEFT JOIN magasins m ON m.id = c.magasin_id
          WHERE c.magasin_id = $1
        `;
        params = [userMagasin];
      }
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      console.error('[caisse/liste]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ?action=operations ────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'operations') {
    try {
      let query, params = [];
      if (isGlobal) {
        query = `
          SELECT o.*, c.nom AS caisse_nom, c.magasin_id,
                 m.nom AS magasin_nom,
                 md.nom AS magasin_destination_nom,
                 p.nom_producteur
          FROM operations_caisse o
          LEFT JOIN caisse c ON c.id = o.caisse_id
          LEFT JOIN magasins m ON m.id = c.magasin_id
          LEFT JOIN magasins md ON md.id = o.magasin_destination_id
          LEFT JOIN producteurs p ON p.id = o.producteur_id
          ORDER BY o.date_operation DESC
          LIMIT 100
        `;
      } else {
        query = `
          SELECT o.*, c.nom AS caisse_nom, c.magasin_id,
                 m.nom AS magasin_nom,
                 md.nom AS magasin_destination_nom,
                 p.nom_producteur
          FROM operations_caisse o
          LEFT JOIN caisse c ON c.id = o.caisse_id
          LEFT JOIN magasins m ON m.id = c.magasin_id
          LEFT JOIN magasins md ON md.id = o.magasin_destination_id
          LEFT JOIN producteurs p ON p.id = o.producteur_id
          WHERE c.magasin_id = $1
          ORDER BY o.date_operation DESC
          LIMIT 100
        `;
        params = [userMagasin];
      }
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      console.error('[caisse/operations]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ?action=producteurs-solde ─────────────────────────────────────────
  if (req.method === 'GET' && action === 'producteurs-solde') {
    try {
      const result = await pool.query(`
        SELECT id, nom_producteur, solde, tel_producteur, matricule
        FROM producteurs
        WHERE statut = 'actif'
          AND type_producteur != 'interne'
          AND solde > 0
        ORDER BY nom_producteur
      `);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST ?action=depot ────────────────────────────────────────────────────
  if (req.method === 'POST' && action === 'depot') {
    const { montant, description, caisse_id: cid } = req.body;
    if (!montant || !cid) return res.status(400).json({ error: 'montant et caisse_id requis' });
    try {
      await pool.query('BEGIN');
      const caisse = await pool.query('SELECT * FROM caisse WHERE id = $1 FOR UPDATE', [cid]);
      if (!caisse.rows[0]) { await pool.query('ROLLBACK'); return res.status(404).json({ error: 'Caisse introuvable' }); }

      const nouveauSolde = parseFloat(caisse.rows[0].solde) + parseFloat(montant);
      await pool.query('UPDATE caisse SET solde = $1 WHERE id = $2', [nouveauSolde, cid]);
      await pool.query(
        `INSERT INTO operations_caisse
           (caisse_id, type_operation, montant, solde_apres, utilisateur, description, date_operation)
         VALUES ($1, 'depot', $2, $3, $4, $5, NOW())`,
        [cid, montant, nouveauSolde, req.user.username || userId, description || 'Dépôt de fonds']
      );
      await pool.query('COMMIT');
      return res.json({ success: true, solde: nouveauSolde });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('[caisse/depot]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST ?action=retrait ──────────────────────────────────────────────────
  if (req.method === 'POST' && action === 'retrait') {
    const { montant, description, caisse_id: cid } = req.body;
    if (!montant || !cid) return res.status(400).json({ error: 'montant et caisse_id requis' });
    try {
      await pool.query('BEGIN');
      const caisse = await pool.query('SELECT * FROM caisse WHERE id = $1 FOR UPDATE', [cid]);
      if (!caisse.rows[0]) { await pool.query('ROLLBACK'); return res.status(404).json({ error: 'Caisse introuvable' }); }
      if (parseFloat(caisse.rows[0].solde) < parseFloat(montant)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Solde insuffisant' });
      }
      const nouveauSolde = parseFloat(caisse.rows[0].solde) - parseFloat(montant);
      await pool.query('UPDATE caisse SET solde = $1 WHERE id = $2', [nouveauSolde, cid]);
      await pool.query(
        `INSERT INTO operations_caisse
           (caisse_id, type_operation, montant, solde_apres, utilisateur, description, date_operation)
         VALUES ($1, 'retrait', $2, $3, $4, $5, NOW())`,
        [cid, montant, nouveauSolde, req.user.username || userId, description || 'Retrait espèces']
      );
      await pool.query('COMMIT');
      return res.json({ success: true, solde: nouveauSolde });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('[caisse/retrait]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST ?action=paiement-producteur ──────────────────────────────────────
  if (req.method === 'POST' && action === 'paiement-producteur') {
    const { montant, producteur_id, caisse_id: cid, description } = req.body;
    if (!montant || !producteur_id || !cid) {
      return res.status(400).json({ error: 'montant, producteur_id et caisse_id requis' });
    }
    try {
      await pool.query('BEGIN');
      const caisse = await pool.query('SELECT * FROM caisse WHERE id = $1 FOR UPDATE', [cid]);
      if (!caisse.rows[0]) { await pool.query('ROLLBACK'); return res.status(404).json({ error: 'Caisse introuvable' }); }
      if (parseFloat(caisse.rows[0].solde) < parseFloat(montant)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Solde caisse insuffisant' });
      }
      const producteur = await pool.query('SELECT * FROM producteurs WHERE id = $1 FOR UPDATE', [producteur_id]);
      if (!producteur.rows[0]) { await pool.query('ROLLBACK'); return res.status(404).json({ error: 'Producteur introuvable' }); }
      if (parseFloat(producteur.rows[0].solde) < parseFloat(montant)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Solde producteur insuffisant' });
      }

      const nouveauSoldeCaisse = parseFloat(caisse.rows[0].solde) - parseFloat(montant);
      const nouveauSoldeProd   = parseFloat(producteur.rows[0].solde) - parseFloat(montant);

      await pool.query('UPDATE caisse SET solde = $1 WHERE id = $2', [nouveauSoldeCaisse, cid]);
      await pool.query('UPDATE producteurs SET solde = $1 WHERE id = $2', [nouveauSoldeProd, producteur_id]);
      await pool.query(
        `INSERT INTO operations_caisse
           (caisse_id, type_operation, montant, solde_apres, utilisateur,
            description, producteur_id, producteur, date_operation)
         VALUES ($1, 'paiement_producteur', $2, $3, $4, $5, $6, $7, NOW())`,
        [cid, montant, nouveauSoldeCaisse, req.user.username || userId,
         description || `Paiement solde — ${producteur.rows[0].nom_producteur}`,
         producteur_id, producteur.rows[0].nom_producteur]
      );
      await pool.query('COMMIT');
      return res.json({ success: true, solde_caisse: nouveauSoldeCaisse, solde_producteur: nouveauSoldeProd });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('[caisse/paiement-producteur]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST ?action=transfert ────────────────────────────────────────────────
  if (req.method === 'POST' && action === 'transfert') {
    if (!isGlobal) return res.status(403).json({ error: 'Transferts inter-caisses réservés au superadmin' });
    const { montant, caisse_id: cid, caisse_destination_id, description } = req.body;
    if (!montant || !cid || !caisse_destination_id) {
      return res.status(400).json({ error: 'montant, caisse_id et caisse_destination_id requis' });
    }
    try {
      await pool.query('BEGIN');
      const src  = await pool.query('SELECT * FROM caisse WHERE id = $1 FOR UPDATE', [cid]);
      const dest = await pool.query('SELECT * FROM caisse WHERE id = $1 FOR UPDATE', [caisse_destination_id]);
      if (!src.rows[0] || !dest.rows[0]) { await pool.query('ROLLBACK'); return res.status(404).json({ error: 'Caisse introuvable' }); }
      if (parseFloat(src.rows[0].solde) < parseFloat(montant)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Solde source insuffisant' });
      }

      const soldeSrc  = parseFloat(src.rows[0].solde)  - parseFloat(montant);
      const soldeDest = parseFloat(dest.rows[0].solde) + parseFloat(montant);

      await pool.query('UPDATE caisse SET solde = $1 WHERE id = $2', [soldeSrc,  cid]);
      await pool.query('UPDATE caisse SET solde = $1 WHERE id = $2', [soldeDest, caisse_destination_id]);

      await pool.query(
        `INSERT INTO operations_caisse
           (caisse_id, type_operation, montant, solde_apres, utilisateur,
            description, magasin_destination_id, date_operation)
         VALUES ($1, 'transfert', $2, $3, $4, $5, $6, NOW())`,
        [cid, montant, soldeSrc, req.user.username || userId,
         description || `Transfert vers ${dest.rows[0].nom}`, dest.rows[0].magasin_id]
      );
      await pool.query(
        `INSERT INTO operations_caisse
           (caisse_id, type_operation, montant, solde_apres, utilisateur,
            description, date_operation)
         VALUES ($1, 'reception_transfert', $2, $3, $4, $5, NOW())`,
        [caisse_destination_id, montant, soldeDest,
         req.user.username || userId,
         description || `Reçu depuis ${src.rows[0].nom}`]
      );
      await pool.query('COMMIT');
      return res.json({ success: true, solde_source: soldeSrc, solde_destination: soldeDest });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('[caisse/transfert]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH ?action=signaler ────────────────────────────────────────────────
  if (req.method === 'PATCH' && action === 'signaler') {
    const { operation_id, motif } = req.body;
    if (!operation_id) return res.status(400).json({ error: 'operation_id requis' });
    try {
      await pool.query(
        `UPDATE operations_caisse 
         SET signale = TRUE, motif_signalement = $1 
         WHERE id = $2`,
        [motif || 'Transaction suspecte', operation_id]
      );
      // Notifier le superadmin
      const admins = await pool.query(`SELECT id FROM users WHERE role = 'superadmin' AND statut = 'actif'`);
      const userRes = await pool.query('SELECT nom, prenom, username FROM users WHERE id = $1', [userId]);
      const u = userRes.rows[0] || {};
      const nomExp = `${u.prenom || ''} ${u.nom || u.username || ''}`.trim();
      for (const admin of admins.rows) {
        await pool.query(
          `INSERT INTO messages
             (expediteur_id, destinataire_id, expediteur, objet, contenu, topic, type_notification)
           VALUES ($1, $2, $3, $4, $5, 'anomalie', 'alerte')`,
          [userId, admin.id, nomExp,
           `⚠️ Transaction suspecte signalée`,
           `${nomExp} a signalé une transaction suspecte (opération #${operation_id}) : ${motif || '—'}`]
        );
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('[caisse/signaler]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Action non reconnue' });
}));