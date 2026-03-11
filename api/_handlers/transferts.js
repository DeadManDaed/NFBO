// api/_handlers/transferts.js
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

const ROLES_AUTORISES = ['superadmin', 'admin', 'stock', 'auditeur'];

module.exports = withCors(requireAuth(async (req, res) => {
  const { role, username, magasin_id: userMagasin } = req.user;

  if (!ROLES_AUTORISES.includes(role)) {
    return res.status(403).json({ message: 'Accès non autorisé' });
  }

  const isSuperAdmin = role === 'superadmin';
  const isAdmin      = role === 'admin';
  const isStock      = role === 'stock';

  // ── GET /api/transferts ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      let query, params = [];

      if (isSuperAdmin || role === 'auditeur') {
        query = `
          SELECT t.*,
            l.description  AS lot_description,
            ms.nom         AS magasin_depart_nom,
            md.nom         AS magasin_destination_nom,
            mr.nom         AS magasin_demandeur_nom
          FROM transferts t
          LEFT JOIN lots      l  ON l.id  = t.lot_id
          LEFT JOIN magasins  ms ON ms.id = t.magasin_depart
          LEFT JOIN magasins  md ON md.id = t.magasin_destination
          LEFT JOIN magasins  mr ON mr.id = t.magasin_demandeur_id
          ORDER BY t.date_creation DESC
        `;
      } else {
        // admin/stock : voir ses transferts entrants ET sortants
        query = `
          SELECT t.*,
            l.description  AS lot_description,
            ms.nom         AS magasin_depart_nom,
            md.nom         AS magasin_destination_nom,
            mr.nom         AS magasin_demandeur_nom
          FROM transferts t
          LEFT JOIN lots      l  ON l.id  = t.lot_id
          LEFT JOIN magasins  ms ON ms.id = t.magasin_depart
          LEFT JOIN magasins  md ON md.id = t.magasin_destination
          LEFT JOIN magasins  mr ON mr.id = t.magasin_demandeur_id
          WHERE t.magasin_depart = $1
             OR t.magasin_destination = $1
             OR t.magasin_demandeur_id = $1
          ORDER BY t.date_creation DESC
        `;
        params = [userMagasin];
      }

      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      console.error('[transferts GET]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/transferts — proposer un transfert ──────────────────────────
  // Qui : stock (magasin demandeur) ou superadmin (ordonne directement)
  if (req.method === 'POST') {
    const {
      lot_id, quantite, quantite_min, quantite_max,
      unite, magasin_depart, magasin_destination,
      chauffeur_id, prix_ref, motif, ordonne
    } = req.body;

    if (!lot_id || !quantite || !magasin_depart || !magasin_destination) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    // stock ne peut proposer que depuis son propre magasin
    if (isStock && parseInt(magasin_depart) !== userMagasin) {
      return res.status(403).json({ error: 'Vous ne pouvez proposer un transfert que depuis votre magasin' });
    }

    // Vérifier stock disponible
    const checkStock = await pool.query(
      `SELECT COALESCE(SUM(vr.quantite_restante), 0) AS stock_actuel
       FROM virtual_revenues vr
       JOIN admissions a ON a.id = vr.admission_id
       WHERE a.lot_id = $1 AND a.magasin_id = $2 AND vr.status = 'pending'`,
      [lot_id, magasin_depart]
    );

    const stockDispo = parseFloat(checkStock.rows[0]?.stock_actuel || 0);
    if (stockDispo < parseFloat(quantite)) {
      return res.status(400).json({
        error: `Stock insuffisant. Disponible: ${stockDispo}, Demandé: ${quantite}`
      });
    }

    // superadmin ordonne → statut direct 'approuvé', bypass étape admin source
    const statutInitial = (isSuperAdmin && ordonne) ? 'approuvé' : 'proposé';
    const ordonneePar   = (isSuperAdmin && ordonne) ? username : null;

    try {
      const result = await pool.query(
        `INSERT INTO transferts
           (lot_id, magasin_depart, magasin_destination, magasin_demandeur_id,
            chauffeur_id, quantite, quantite_min, quantite_max,
            unite, prix_ref, utilisateur, motif, statut,
            ordonne_par, approuve_par, date_approbation)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
           CASE WHEN $14 IS NOT NULL THEN $14 ELSE NULL END,
           CASE WHEN $14 IS NOT NULL THEN NOW() ELSE NULL END)
         RETURNING id`,
        [
          lot_id, magasin_depart, magasin_destination,
          isStock ? userMagasin : null,
          chauffeur_id || null,
          quantite, quantite_min || null, quantite_max || null,
          unite, prix_ref || 0,
          username, motif || null,
          statutInitial, ordonneePar,
        ]
      );

      // Notifier l'admin du magasin source si proposé par stock
      if (statutInitial === 'proposé') {
        const adminSource = await pool.query(
          `SELECT id FROM users WHERE magasin_id = $1 AND role = 'admin' AND statut = 'actif' LIMIT 1`,
          [magasin_depart]
        );
        if (adminSource.rows[0]) {
          await pool.query(
            `INSERT INTO messages (destinataire_id, objet, contenu, topic, type_notification)
             VALUES ($1, $2, $3, 'transfert', 'info')`,
            [
              adminSource.rows[0].id,
              `📦 Demande de transfert — Lot #${lot_id}`,
              `${username} propose un transfert de ${quantite} ${unite} vers magasin #${magasin_destination}.\nMotif : ${motif || '—'}\nTransfert #${result.rows[0].id} — à approuver dans Transferts.`,
            ]
          );
        }
      }

      return res.status(201).json({
        message: statutInitial === 'approuvé'
          ? 'Transfert ordonné et approuvé'
          : 'Demande de transfert soumise — en attente d\'approbation',
        transfert_id: result.rows[0].id,
      });

    } catch (err) {
      console.error('[transferts POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PUT /api/transferts?id=X — transitions de statut ─────────────────────
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id requis' });

    const { action, chauffeur_id, observations } = req.body;

    // Charger le transfert
    const tr = await pool.query('SELECT * FROM transferts WHERE id = $1', [id]);
    if (!tr.rows[0]) return res.status(404).json({ error: 'Transfert introuvable' });
    const t = tr.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ── approuver : admin source ──────────────────────────────────────────
      if (action === 'approuver') {
        if (!isAdmin && !isSuperAdmin) {
          return res.status(403).json({ error: 'Admin requis pour approuver' });
        }
        if (!isSuperAdmin && t.magasin_depart !== userMagasin) {
          return res.status(403).json({ error: 'Vous n\'êtes pas l\'admin du magasin source' });
        }
        if (t.statut !== 'proposé') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut} — ne peut pas être approuvé` });
        }

        await client.query(
          `UPDATE transferts SET
             statut = 'approuvé',
             approuve_par = $1,
             date_approbation = NOW()
           WHERE id = $2`,
          [username, id]
        );

        // Notifier admin destination
        const adminDest = await client.query(
          `SELECT id FROM users WHERE magasin_id = $1 AND role = 'admin' AND statut = 'actif' LIMIT 1`,
          [t.magasin_destination]
        );
        if (adminDest.rows[0]) {
          await client.query(
            `INSERT INTO messages (destinataire_id, objet, contenu, topic, type_notification)
             VALUES ($1, $2, $3, 'transfert', 'info')`,
            [
              adminDest.rows[0].id,
              `🚚 Transfert approuvé — Lot #${t.lot_id}`,
              `Le transfert #${id} de ${t.quantite} ${t.unite} a été approuvé par ${username}.\nEn attente d\'assignation du chauffeur.`,
            ]
          );
        }
      }

      // ── expedier : admin source assigne chauffeur → en_transit ───────────
      else if (action === 'expedier') {
        if (!isAdmin && !isSuperAdmin) {
          return res.status(403).json({ error: 'Admin requis pour expédier' });
        }
        if (!isSuperAdmin && t.magasin_depart !== userMagasin) {
          return res.status(403).json({ error: 'Vous n\'êtes pas l\'admin du magasin source' });
        }
        if (t.statut !== 'approuvé') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut} — doit être approuvé d\'abord` });
        }

        // Vérifier que le chauffeur appartient à l'un des deux magasins
        if (chauffeur_id) {
          const chauf = await client.query(
            `SELECT magasin_id FROM employers WHERE id = $1`,
            [chauffeur_id]
          );
          const chMagasin = chauf.rows[0]?.magasin_id;
          if (chMagasin !== t.magasin_depart && chMagasin !== t.magasin_destination) {
            return res.status(400).json({
              error: 'Le chauffeur doit appartenir au magasin source ou destination'
            });
          }
        }

        // Déduire le stock du magasin source
        await client.query(
          `UPDATE virtual_revenues vr
           SET quantite_restante = GREATEST(0, quantite_restante - $1),
               status = CASE WHEN quantite_restante - $1 <= 0 THEN 'realized' ELSE status END
           FROM admissions a
           WHERE vr.admission_id = a.id
             AND a.lot_id = $2
             AND a.magasin_id = $3
             AND vr.status = 'pending'`,
          [t.quantite, t.lot_id, t.magasin_depart]
        );

        await client.query(
          `UPDATE transferts SET
             statut = 'en_transit',
             chauffeur_id = COALESCE($1, chauffeur_id)
           WHERE id = $2`,
          [chauffeur_id || null, id]
        );
      }

      // ── recevoir : admin destination confirme ─────────────────────────────
      else if (action === 'recevoir') {
        if (!isAdmin && !isSuperAdmin) {
          return res.status(403).json({ error: 'Admin requis pour confirmer la réception' });
        }
        if (!isSuperAdmin && t.magasin_destination !== userMagasin) {
          return res.status(403).json({ error: 'Vous n\'êtes pas l\'admin du magasin destination' });
        }
        if (t.statut !== 'en_transit') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut} — doit être en_transit` });
        }

        await client.query(
          `UPDATE transferts SET
             statut = 'reçu',
             recu_par = $1,
             date_reception_admin = NOW(),
             date_reception = NOW()
           WHERE id = $2`,
          [username, id]
        );

        // Notifier superadmin
        const superAdmins = await client.query(
          `SELECT id FROM users WHERE role = 'superadmin' AND statut = 'actif'`
        );
        for (const sa of superAdmins.rows) {
          await client.query(
            `INSERT INTO messages (destinataire_id, objet, contenu, topic, type_notification)
             VALUES ($1, $2, $3, 'transfert', 'info')`,
            [
              sa.id,
              `✅ Réception confirmée — Transfert #${id}`,
              `${username} a confirmé la réception du transfert #${id} (${t.quantite} ${t.unite}, Lot #${t.lot_id}).\nEn attente de votre validation finale.`,
            ]
          );
        }
      }

      // ── valider : superadmin valide définitivement ────────────────────────
      else if (action === 'valider') {
        if (!isSuperAdmin) {
          return res.status(403).json({ error: 'Superadmin requis pour la validation finale' });
        }
        if (t.statut !== 'reçu') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut} — doit être reçu` });
        }

        // Créditer le stock du magasin destination
        // Créer une admission virtuelle pour refléter l'entrée de stock
        const admResult = await client.query(
          `INSERT INTO admissions
             (lot_id, magasin_id, quantite, unite, prix_ref, utilisateur, source)
           VALUES ($1, $2, $3, $4, $5, $6, 'transfert')
           RETURNING id`,
          [t.lot_id, t.magasin_destination, t.quantite, t.unite, t.prix_ref, username]
        );

        await client.query(
          `INSERT INTO virtual_revenues
             (lot_id, admission_id, quantite_restante, benefice_espere, status)
           VALUES ($1, $2, $3, $3 * $4 * 0.10, 'pending')`,
          [t.lot_id, admResult.rows[0].id, t.quantite, t.prix_ref]
        );

        await client.query(
          `UPDATE transferts SET
             statut = 'livré',
             valide_par = $1,
             date_validation = NOW()
           WHERE id = $2`,
          [username, id]
        );

        // Log audit
        await client.query(
          `INSERT INTO audit (date, utilisateur, action, type_action, entite, entite_id, details)
           VALUES (NOW(), $1, $2, 'validation', 'transferts', $3, $4)`,
          [
            username,
            `Transfert #${id} validé définitivement`,
            id,
            JSON.stringify({ quantite: t.quantite, lot_id: t.lot_id, observations }),
          ]
        );
      }

      // ── rejeter : admin source, admin destination, ou superadmin ──────────
      else if (action === 'rejeter') {
        const peutRejeter =
          isSuperAdmin ||
          (isAdmin && (t.magasin_depart === userMagasin || t.magasin_destination === userMagasin));

        if (!peutRejeter) {
          return res.status(403).json({ error: 'Non autorisé à rejeter ce transfert' });
        }

        const statutsRejetables = ['proposé', 'approuvé', 'en_transit', 'reçu'];
        if (!statutsRejetables.includes(t.statut)) {
          return res.status(400).json({ error: `Statut actuel : ${t.statut} — ne peut pas être rejeté` });
        }

        // Si en_transit → restaurer le stock source
        if (t.statut === 'en_transit') {
          const admRestaure = await client.query(
            `INSERT INTO admissions
               (lot_id, magasin_id, quantite, unite, prix_ref, utilisateur, source)
             VALUES ($1, $2, $3, $4, $5, $6, 'retour_transfert')
             RETURNING id`,
            [t.lot_id, t.magasin_depart, t.quantite, t.unite, t.prix_ref, username]
          );
          await client.query(
            `INSERT INTO virtual_revenues
               (lot_id, admission_id, quantite_restante, benefice_espere, status)
             VALUES ($1, $2, $3, $3 * $4 * 0.10, 'pending')`,
            [t.lot_id, admRestaure.rows[0].id, t.quantite, t.prix_ref]
          );
        }

        await client.query(
          `UPDATE transferts SET
             statut = 'rejeté',
             motif = COALESCE($1, motif)
           WHERE id = $2`,
          [observations || null, id]
        );
      }

      else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Action inconnue : ${action}` });
      }

      await client.query('COMMIT');
      return res.json({ success: true, message: `Transfert ${action} avec succès` });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[transferts PUT/${action}]`, err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }

  return res.status(405).json({ error: `Méthode non supportée : ${req.method}` });
}));
