// api/messages.js
const pool            = require('./_lib/db');
const { withCors }    = require('./_lib/cors');
const { requireAuth } = require('./_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  const { id, action, role, magasin_id } = req.query;
  const userId = String(req.user.id); // toujours string pour comparaison avec users.id (varchar)

  // ── GET ?action=unread-count ───────────────────────────────────────────────
  if (req.method === 'GET' && action === 'unread-count') {
    try {
      const r = await pool.query(
        `SELECT COUNT(*) AS count FROM messages
         WHERE destinataire_id::text = $1 AND lu = false`,
        [userId]
      );
      return res.json({ count: parseInt(r.rows[0].count, 10) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ?action=destinataires ──────────────────────────────────────────────
  if (req.method === 'GET' && action === 'destinataires') {
    try {
      const targetRole    = role       || req.user.role;
      const targetMagasin = magasin_id || req.user.magasin_id;

      let usersRes;
      if (targetRole === 'superadmin') {
        usersRes = await pool.query(
          `SELECT id, username, nom, prenom, role, magasin_id
           FROM users
           WHERE statut = 'actif' AND id::text != $1
           ORDER BY nom`,
          [userId]
        );
      } else {
        usersRes = await pool.query(
          `SELECT id, username, nom, prenom, role, magasin_id
           FROM users
           WHERE statut = 'actif'
             AND id::text != $1
             AND (magasin_id = $2 OR role IN ('superadmin', 'admin', 'auditeur'))
           ORDER BY nom`,
          [userId, targetMagasin]
        );
      }

      const grouped = usersRes.rows.reduce((acc, u) => {
        const label = u.role.charAt(0).toUpperCase() + u.role.slice(1);
        if (!acc[label]) acc[label] = [];
        acc[label].push({
          id:         u.id,
          label:      `${u.prenom || ''} ${u.nom || u.username}`.trim(),
          role:       u.role,
          magasin_id: u.magasin_id,
        });
        return acc;
      }, {});

      return res.json({ grouped, flat: usersRes.rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ?action=sent ───────────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'sent') {
    try {
      const r = await pool.query(
        `SELECT m.id, m.objet, m.contenu, m.date, m.inserted_at,
                m.destinataire_id, m.lu, m.type_notification, m.topic,
                u.nom AS destinataire_nom, u.prenom AS destinataire_prenom,
                u.username AS destinataire_username
         FROM messages m
         LEFT JOIN users u ON u.id = m.destinataire_id::text
         WHERE m.expediteur_id::text = $1
         ORDER BY m.inserted_at DESC
         LIMIT 100`,
        [userId]
      );
      return res.json(r.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ?id=X  (détail + marquer lu) ──────────────────────────────────────
  if (req.method === 'GET' && id) {
    try {
      const r = await pool.query(
        `SELECT m.*,
                u.nom AS exp_nom, u.prenom AS exp_prenom,
                u.username AS exp_username, u.role AS exp_role
         FROM messages m
         LEFT JOIN users u ON u.id = m.expediteur_id::text
         WHERE m.id = $1
           AND (m.destinataire_id::text = $2 OR m.expediteur_id::text = $2)`,
        [id, userId]
      );
      if (!r.rows[0]) return res.status(404).json({ error: 'Message introuvable' });

      if (String(r.rows[0].destinataire_id) === userId && !r.rows[0].lu) {
        await pool.query(
          'UPDATE messages SET lu = TRUE, updated_at = NOW() WHERE id = $1',
          [id]
        );
      }
      return res.json(r.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET /  (boîte de réception) ───────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const r = await pool.query(
        `SELECT m.id, m.objet, m.contenu, m.date, m.inserted_at,
                m.expediteur_id, m.expediteur, m.lu,
                m.type_notification, m.topic, m.private,
                u.nom AS exp_nom, u.prenom AS exp_prenom,
                u.username AS exp_username, u.role AS exp_role
         FROM messages m
         LEFT JOIN users u ON u.id = m.expediteur_id::text
         WHERE m.destinataire_id::text = $1
         ORDER BY m.inserted_at DESC
         LIMIT 100`,
        [userId]
      );
      return res.json(r.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /  (envoyer) ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      destinataire_id,
      destinataires,
      objet,
      contenu,
      topic             = 'direct',
      extension         = 'text',
      type_notification = 'interne',
      payload           = null,
      event             = null,
      private: isPrivate = false,
    } = req.body;

    if (!objet || !contenu) {
      return res.status(400).json({ error: 'objet et contenu requis' });
    }

    try {
      const userRes = await pool.query(
        'SELECT nom, prenom, username FROM users WHERE id::text = $1',
        [userId]
      );
      const u      = userRes.rows[0] || {};
      const nomExp = `${u.prenom || ''} ${u.nom || u.username || 'Système'}`.trim();

      const targets = destinataires && Array.isArray(destinataires) && destinataires.length
        ? destinataires
        : destinataire_id
          ? [destinataire_id]
          : null;

      if (!targets || targets.length === 0) {
        return res.status(400).json({ error: 'Au moins un destinataire requis' });
      }

      const inserted = [];
      for (const dest_id of targets) {
        const r = await pool.query(
          `INSERT INTO messages
             (expediteur_id, destinataire_id, expediteur, objet, contenu,
              topic, extension, type_notification, payload, event, private)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING id, inserted_at`,
          [userId, dest_id, nomExp, objet, contenu,
           topic, extension, type_notification,
           payload ? JSON.stringify(payload) : null,
           event, isPrivate]
        );
        inserted.push(r.rows[0]);
      }

      return res.status(201).json({ success: true, inserted });
    } catch (err) {
      console.error('[messages POST]', err);
      return res.status(500).json({ error: "Échec de l'envoi" });
    }
  }

  // ── PATCH ?id=X  (marquer lu/non-lu) ──────────────────────────────────────
  if (req.method === 'PATCH' && id) {
    const { lu } = req.body;
    try {
      await pool.query(
        `UPDATE messages SET lu = $1, updated_at = NOW()
         WHERE id = $2 AND destinataire_id::text = $3`,
        [lu !== false, id, userId]
      );
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE ?id=X ───────────────────────────────────────────────────────────
  if (req.method === 'DELETE' && id) {
    try {
      await pool.query(
        `DELETE FROM messages WHERE id = $1
         AND (expediteur_id::text = $2 OR destinataire_id::text = $2)`,
        [id, userId]
      );
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Méthode non supportée' });
}));
