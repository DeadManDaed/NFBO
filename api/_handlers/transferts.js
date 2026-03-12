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

  // ── GET /api/transferts/sources?lot_id=X ─────────────────────────────────
  const url = req.url?.split('?')[0].replace(/\/$/, '');
  if (req.method === 'GET' && req.query.sources === '1') {
  const { lot_id } = req.query;
  if (!lot_id) return res.status(400).json({ error: 'lot_id requis' });
    try {
      const result = await pool.query(`
        WITH retraits_freq AS (
          SELECT r.lot_id,
            COUNT(*) / NULLIF(
              EXTRACT(DAY FROM NOW() - MIN(r.date_sortie::timestamptz)), 0
            ) AS freq
          FROM retraits r
          GROUP BY r.lot_id
        ),
        moyenne AS (
          SELECT AVG(freq) AS moy FROM retraits_freq
        ),
        stock_dispo AS (
          SELECT
            a.magasin_id,
            m.nom                          AS magasin_nom,
            m.code                         AS magasin_code,
            SUM(vr.quantite_restante)      AS stock_actuel,
            rf.freq                        AS freq_retrait,
            mo.moy                         AS freq_moyenne,
            CASE WHEN rf.freq IS NULL OR rf.freq < mo.moy / 2.0
              THEN true ELSE false
            END AS dormant
          FROM virtual_revenues vr
          JOIN admissions a ON a.id = vr.admission_id
          JOIN magasins m   ON m.id = a.magasin_id
          LEFT JOIN retraits_freq rf ON rf.lot_id = a.lot_id
          CROSS JOIN moyenne mo
          WHERE a.lot_id = $1
            AND vr.status = 'pending'
            AND vr.quantite_restante > 0
          GROUP BY a.magasin_id, m.nom, m.code, rf.freq, mo.moy
        )
        SELECT * FROM stock_dispo
        ORDER BY dormant DESC, stock_actuel DESC
      `, [lot_id]);
      return res.json(result.rows);
    } catch (err) {
      console.error('[transferts/sources]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/transferts ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      let query, params = [];
      if (isSuperAdmin || role === 'auditeur') {
        query = `
          SELECT t.*,
            l.description        AS lot_description,
            ms.nom               AS magasin_depart_nom,
            md.nom               AS magasin_destination_nom,
            mr.nom               AS magasin_demandeur_nom
          FROM transferts t
          LEFT JOIN lots     l  ON l.id  = t.lot_id
          LEFT JOIN magasins ms ON ms.id = t.magasin_depart
          LEFT JOIN magasins md ON md.id = t.magasin_destination
          LEFT JOIN magasins mr ON mr.id = t.magasin_demandeur_id
          ORDER BY t.date_creation DESC
        `;
      } else {
        query = `
          SELECT t.*,
            l.description        AS lot_description,
            ms.nom               AS magasin_depart_nom,
            md.nom               AS magasin_destination_nom,
            mr.nom               AS magasin_demandeur_nom
          FROM transferts t
          LEFT JOIN lots     l  ON l.id  = t.lot_id
          LEFT JOIN magasins ms ON ms.id = t.magasin_depart
          LEFT JOIN magasins md ON md.id = t.magasin_destination
          LEFT JOIN magasins mr ON mr.id = t.magasin_demandeur_id
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

  // ── POST /api/transferts ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      lot_id, quantite, quantite_min, quantite_max,
      unite, magasin_depart, magasin_destination,
      chauffeur_id, prix_ref, motif, ordonne,
    } = req.body;

    if (!lot_id || !magasin_destination) {
      return res.status(400).json({ error: 'Données incomplètes (lot et destination requis)' });
    }

    // Validation stock
    if (isStock) {
      if (!quantite_min || !quantite_max) {
        return res.status(400).json({ error: 'Quantités min et max obligatoires' });
      }
      if (!motif) {
        return res.status(400).json({ error: 'Motif obligatoire' });
      }
    }

    // Validation admin/superadmin
    if (!isStock) {
      if (!quantite || !magasin_depart) {
        return res.status(400).json({ error: 'Quantité et magasin source requis' });
      }
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
          error: `Stock insuffisant. Disponible : ${stockDispo}, Demandé : ${quantite}`
        });
      }
    }

    try {
      let result;

      // superadmin ordonne → statut 'approuvé' directement
      if (isSuperAdmin && ordonne) {
        result = await pool.query(
          `INSERT INTO transferts
             (lot_id, magasin_depart, magasin_destination,
              chauffeur_id, quantite, quantite_min, quantite_max,
              unite, prix_ref, utilisateur, motif,
              statut, ordonne_par, approuve_par, date_approbation)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
                   'approuvé',$10,$10,NOW())
           RETURNING id`,
          [
            lot_id, magasin_depart, magasin_destination,
            chauffeur_id || null,
            quantite, quantite_min || null, quantite_max || null,
            unite || null, prix_ref || 0,
            username, motif || null,
          ]
        );
      } else {
        // stock ou admin → statut 'proposé'
        result = await pool.query(
          `INSERT INTO transferts
             (lot_id, magasin_depart, magasin_destination, magasin_demandeur_id,
              chauffeur_id, quantite, quantite_min, quantite_max,
              unite, prix_ref, utilisateur, motif, statut)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'proposé')
           RETURNING id`,
          [
            lot_id,
            magasin_depart || null,
            magasin_destination,
            isStock ? userMagasin : null,
            chauffeur_id || null,
            quantite || null,
            quantite_min || null,
            quantite_max || null,
            unite || null,
            prix_ref || 0,
            username,
            motif || null,
          ]
        );
      }

      const newId = result.rows[0].id;

      // Notifier superadmin + auditeur si proposé
      if (!ordonne) {
        const destinataires = await pool.query(
          `SELECT id FROM users WHERE role IN ('superadmin', 'auditeur') AND statut = 'actif'`
        );
        for (const dest of destinataires.rows) {
          await pool.query(
            `INSERT INTO messages (destinataire_id, objet, contenu, topic, type_notification)
             VALUES ($1, $2, $3, 'transfert', 'info')`,
            [
              dest.id,
              `📦 Demande de transfert — Lot #${lot_id}`,
              `${username} demande un transfert vers magasin #${magasin_destination}.\nMotif : ${motif || '—'}\nQuantité souhaitée : ${quantite_min || '—'} à ${quantite_max || '—'}\nTransfert #${newId} — à traiter dans Transferts.`,
            ]
          );
        }
      }

      // Si ordonné → notifier admins du magasin source
      if (isSuperAdmin && ordonne && magasin_depart) {
        const admins = await pool.query(
          `SELECT id FROM users WHERE magasin_id = $1 AND role = 'admin' AND statut = 'actif'`,
          [magasin_depart]
        );
        for (const adm of admins.rows) {
          await pool.query(
            `INSERT INTO messages (destinataire_id, objet, contenu, topic, type_notification)
             VALUES ($1, $2, $3, 'transfert', 'urgent')`,
            [
              adm.id,
              `⚡ Ordre de transfert #${newId}`,
              `Le superadmin ordonne un transfert de ${quantite} ${unite || ''} (Lot #${lot_id}) vers magasin #${magasin_destination}.\nMobilisez le stock et un chauffeur dès que possible.`,
            ]
          );
        }
      }

      return res.status(201).json({
        message: (isSuperAdmin && ordonne)
          ? 'Transfert ordonné avec succès'
          : 'Demande soumise — superadmin et auditeur notifiés',
        transfert_id: newId,
      });

    } catch (err) {
      console.error('[transferts POST]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PUT /api/transferts?id=X ──────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id requis' });

    const { action, chauffeur_id, observations, magasin_depart: sourceDésigné } = req.body;

    const tr = await pool.query('SELECT * FROM transferts WHERE id = $1', [id]);
    if (!tr.rows[0]) return res.status(404).json({ error: 'Transfert introuvable' });
    const t = tr.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ── approuver : superadmin désigne source si absente ─────────────────
      if (action === 'approuver') {
        if (!isSuperAdmin) {
          return res.status(403).json({ error: 'Superadmin requis pour approuver' });
        }
        if (t.statut !== 'proposé') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut}` });
        }
        if (!t.magasin_depart && !sourceDésigné) {
          return res.status(400).json({ error: 'Magasin source à désigner pour approuver' });
        }

        const sourceFinale = t.magasin_depart || parseInt(sourceDésigné);

        await client.query(
          `UPDATE transferts SET
             statut           = 'approuvé',
             magasin_depart   = $1,
             approuve_par     = $2,
             date_approbation = NOW()
           WHERE id = $3`,
          [sourceFinale, username, id]
        );

        const admins = await client.query(
          `SELECT id FROM users WHERE magasin_id = $1 AND role = 'admin' AND statut = 'actif'`,
          [sourceFinale]
        );
        for (const adm of admins.rows) {
          await client.query(
            `INSERT INTO messages (destinataire_id, objet, contenu, topic, type_notification)
             VALUES ($1, $2, $3, 'transfert', 'info')`,
            [
              adm.id,
              `📦 Transfert approuvé — à expédier`,
              `Le transfert #${id} a été approuvé par ${username}.\nMobilisez le stock et assignez un chauffeur pour expédier.`,
            ]
          );
        }
      }

      // ── expedier : admin source ───────────────────────────────────────────
      else if (action === 'expedier') {
        if (!isAdmin && !isSuperAdmin) {
          return res.status(403).json({ error: 'Admin requis pour expédier' });
        }
        if (!isSuperAdmin && t.magasin_depart !== userMagasin) {
          return res.status(403).json({ error: "Vous n'êtes pas l'admin du magasin source" });
        }
        if (t.statut !== 'approuvé') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut}` });
        }

        if (chauffeur_id) {
          const chauf = await client.query(
            `SELECT magasin_id FROM employers WHERE id = $1`, [chauffeur_id]
          );
          const chMag = chauf.rows[0]?.magasin_id;
          if (chMag !== t.magasin_depart && chMag !== t.magasin_destination) {
            return res.status(400).json({
              error: 'Le chauffeur doit appartenir au magasin source ou destination'
            });
          }
        }

        // Déduire stock source
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
             statut       = 'en_transit',
             chauffeur_id = COALESCE($1, chauffeur_id)
           WHERE id = $2`,
          [chauffeur_id || null, id]
        );

        const adminDest = await client.query(
          `SELECT id FROM users WHERE magasin_id = $1 AND role = 'admin' AND statut = 'actif'`,
          [t.magasin_destination]
        );
        for (const adm of adminDest.rows) {
          await client.query(
            `INSERT INTO messages (destinataire_id, objet, contenu, topic, type_notification)
             VALUES ($1, $2, $3, 'transfert', 'info')`,
            [
              adm.id,
              `🚚 Transfert en route — #${id}`,
              `Le transfert #${id} (${t.quantite} ${t.unite}, Lot #${t.lot_id}) est en transit.\nConfirmez la réception à l'arrivée.`,
            ]
          );
        }
      }

      // ── recevoir : admin destination ──────────────────────────────────────
      else if (action === 'recevoir') {
        if (!isAdmin && !isSuperAdmin) {
          return res.status(403).json({ error: 'Admin requis pour confirmer la réception' });
        }
        if (!isSuperAdmin && t.magasin_destination !== userMagasin) {
          return res.status(403).json({ error: "Vous n'êtes pas l'admin du magasin destination" });
        }
        if (t.statut !== 'en_transit') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut}` });
        }

        await client.query(
          `UPDATE transferts SET
             statut               = 'reçu',
             recu_par             = $1,
             date_reception_admin = NOW(),
             date_reception       = NOW()
           WHERE id = $2`,
          [username, id]
        );

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

      // ── valider : superadmin ──────────────────────────────────────────────
      else if (action === 'valider') {
        if (!isSuperAdmin) {
          return res.status(403).json({ error: 'Superadmin requis pour la validation finale' });
        }
        if (t.statut !== 'reçu') {
          return res.status(400).json({ error: `Statut actuel : ${t.statut}` });
        }

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
             statut          = 'livré',
             valide_par      = $1,
             date_validation = NOW()
           WHERE id = $2`,
          [username, id]
        );

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

      // ── rejeter ───────────────────────────────────────────────────────────
      else if (action === 'rejeter') {
        const peutRejeter =
          isSuperAdmin ||
          (isAdmin && (t.magasin_depart === userMagasin || t.magasin_destination === userMagasin));

        if (!peutRejeter) {
          return res.status(403).json({ error: 'Non autorisé à rejeter ce transfert' });
        }

        const statutsRejetables = ['proposé', 'approuvé', 'en_transit', 'reçu'];
        if (!statutsRejetables.includes(t.statut)) {
          return res.status(400).json({ error: `Statut : ${t.statut} — ne peut pas être rejeté` });
        }

        // Si en_transit → restaurer stock source
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
             motif  = COALESCE($1, motif)
           WHERE id = $2`,
          [observations || null, id]
        );
      }

      else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Action inconnue : ${action}` });
      }

      await client.query('COMMIT');
      return res.json({ success: true, message: `Action "${action}" effectuée` });

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
