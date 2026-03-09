// api/_handlers/caisse.js

const pool            = require('../_lib/db');
const { withCors }    = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

const ROLES_AUTORISES = ['superadmin', 'admin', 'caisse', 'auditeur'];
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
// ── GET ?action=producteurs ───────────────────────────────────────────────
  if (req.method === 'GET' && action === 'producteurs') {
    try {
      const produceursRes = await pool.query(`
        SELECT p.id, p.nom_producteur, p.tel_producteur, p.solde, p.points_fidelite,
               p.statut, p.localite, p.region_id, p.departement_id, p.arrondissement_id,
               r.nom AS region, d.nom AS departement, a.nom AS arrondissement
        FROM producteurs p
        LEFT JOIN regions r       ON r.id = p.region_id
        LEFT JOIN departements d  ON d.id = p.departement_id
        LEFT JOIN arrondissements a ON a.id = p.arrondissement_id
        ORDER BY p.nom_producteur ASC
      `);

      const ids = produceursRes.rows.map(p => p.id);
      let transactions = [];
      if (ids.length > 0) {
        const txRes = await pool.query(`
          SELECT oc.producteur_id, oc.type_operation, oc.montant,
                 oc.date_operation, oc.description,
                 m.nom AS magasin
          FROM operations_caisse oc
          LEFT JOIN caisse c  ON c.id = oc.caisse_id
          LEFT JOIN magasins m ON m.id = c.magasin_id
          WHERE oc.producteur_id = ANY($1)
          ORDER BY oc.date_operation DESC
        `, [ids]);
        transactions = txRes.rows;
      }

      const result = produceursRes.rows.map(p => ({
        ...p,
        transactions: transactions
          .filter(t => t.producteur_id === p.id)
          .slice(0, 5),
      }));

      return res.json(result);
    } catch (err) {
      console.error('[caisse/producteurs]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST ?action=cheque ───────────────────────────────────────────────────
  if (req.method === 'POST' && action === 'cheque') {
    const { producteur_id, montant, date_expiration, notes } = req.body;
    if (!producteur_id || !montant || !date_expiration) {
      return res.status(400).json({ error: 'producteur_id, montant et date_expiration requis' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const chequeRes = await client.query(`
        INSERT INTO cheques (producteur_id, magasin_id, emetteur, montant, date_expiration, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [producteur_id, req.user.magasin_id, req.user.username,
          montant, date_expiration, notes || null]);
      const cheque = chequeRes.rows[0];

      // Notifier admin local + auditeur + superadmin
      const destsRes = await client.query(`
        SELECT id FROM users
        WHERE role IN ('superadmin', 'auditeur')
           OR (role = 'admin' AND magasin_id = $1)
      `, [req.user.magasin_id]);

      for (const dest of destsRes.rows) {
        await client.query(`
          INSERT INTO messages
            (expediteur_id, destinataire_id, objet, contenu, topic, type_notification)
          VALUES ($1, $2, $3, $4, 'cheque', 'info')
        `, [
          req.user.id, dest.id,
          `Chèque émis — ${Number(montant).toLocaleString('fr-FR')} FCFA`,
          `Chèque #${cheque.code} émis par ${req.user.username} pour producteur #${producteur_id}. Valide jusqu'au ${date_expiration}.`,
        ]);
      }

      await client.query('COMMIT');
      return res.status(201).json(cheque);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[caisse/cheque]', err.message);
      return res.status(500).json({ error: 'Erreur émission chèque' });
    } finally {
      client.release();
    }
  }

  // ── GET ?action=cheque&code=UUID ──────────────────────────────────────────
  if (req.method === 'GET' && action === 'cheque') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code requis' });
    try {
      const result = await pool.query(`
        SELECT c.*, p.nom_producteur, p.solde AS solde_producteur
        FROM cheques c
        JOIN producteurs p ON p.id = c.producteur_id
        WHERE c.code = $1
      `, [code]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Chèque introuvable' });
      const cheque = result.rows[0];
      if (cheque.statut === 'annulé') return res.status(400).json({ error: 'Chèque annulé' });
      if (new Date(cheque.date_expiration) < new Date()) {
        await pool.query('UPDATE cheques SET statut = $1 WHERE id = $2', ['expiré', cheque.id]);
        return res.status(400).json({ error: 'Chèque expiré' });
      }
      return res.json(cheque);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST ?action=scanner ──────────────────────────────────────────────────
  if (req.method === 'POST' && action === 'scanner') {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code UUID requis' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const chequeRes = await client.query(
        'SELECT * FROM cheques WHERE code = $1 FOR UPDATE', [code]
      );
      if (!chequeRes.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Chèque introuvable' });
      }
      const cheque = chequeRes.rows[0];

      if (cheque.statut === 'annulé') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Chèque annulé' });
      }
      if (new Date(cheque.date_expiration) < new Date()) {
        await client.query('UPDATE cheques SET statut = $1 WHERE id = $2', ['expiré', cheque.id]);
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Chèque expiré' });
      }

      const prodRes = await client.query(
        'SELECT solde FROM producteurs WHERE id = $1', [cheque.producteur_id]
      );
      const solde = parseFloat(prodRes.rows[0]?.solde) || 0;
      if (solde < parseFloat(cheque.montant)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Solde producteur insuffisant (${solde.toLocaleString('fr-FR')} FCFA)`
        });
      }

      // Débiter producteur
      await client.query(
        'UPDATE producteurs SET solde = solde - $1 WHERE id = $2',
        [cheque.montant, cheque.producteur_id]
      );

      // Créditer caisse du magasin scanneur
      const caisseRes = await client.query(
        'SELECT id, solde FROM caisse WHERE magasin_id = $1', [req.user.magasin_id]
      );
      if (caisseRes.rows[0]) {
        const nouveauSolde = parseFloat(caisseRes.rows[0].solde) + parseFloat(cheque.montant);
        await client.query('UPDATE caisse SET solde = $1 WHERE id = $2',
          [nouveauSolde, caisseRes.rows[0].id]);
        await client.query(`
          INSERT INTO operations_caisse
            (caisse_id, type_operation, montant, solde_apres, utilisateur, description, producteur_id, date_operation)
          VALUES ($1, 'cheque', $2, $3, $4, $5, $6, NOW())
        `, [caisseRes.rows[0].id, cheque.montant, nouveauSolde, req.user.username,
            `Encaissement chèque #${cheque.code.slice(0,8)}`, cheque.producteur_id]);
      }

      // Journaliser l'utilisation + incrémenter compteur
      await client.query(`
        INSERT INTO utilisations_cheques (cheque_id, magasin_id, operateur, montant)
        VALUES ($1, $2, $3, $4)
      `, [cheque.id, req.user.magasin_id, req.user.username, cheque.montant]);

      await client.query(
        'UPDATE cheques SET utilisations = utilisations + 1 WHERE id = $1', [cheque.id]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Chèque encaissé avec succès', montant: cheque.montant });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[caisse/scanner]', err.message);
      return res.status(500).json({ error: 'Erreur encaissement chèque' });
    } finally {
      client.release();
    }
  }
  return res.status(400).json({ error: 'Action non reconnue' });
}));