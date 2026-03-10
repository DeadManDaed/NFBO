// api/auth/index.js
// Login/logout gérés par Supabase Auth côté frontend.
// Ce fichier ne garde que /me pour compatibilité avec le code existant,
// et /confirm pour la confirmation email via Supabase.

const { withCors }    = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

module.exports = withCors(async (req, res) => {
  const url    = req.url?.split('?')[0].replace(/\/$/, '');
  const action = url.split('/').pop();

  // ─── DEBUG ──────────────────────────────────────────────────────────────────
  if (action === 'debug-env') {
    return res.json({
      has_db_url:            !!process.env.DATABASE_URL,
      has_supabase_secret:   !!process.env.SUPABASE_JWT_SECRET,
      node_env:              process.env.NODE_ENV,
    });
  }

  // ─── LOGIN ───────────────────────────────────────────────────────────────────
  // Le login est désormais géré par Supabase Auth côté frontend (useAuth.jsx).
  // Cette route renvoie 410 Gone pour signaler qu'elle n'est plus utilisée.
  if (action === 'login') {
    return res.status(410).json({ message: 'Login géré par Supabase Auth' });
  }

  // ─── LOGOUT ──────────────────────────────────────────────────────────────────
  if (action === 'logout') {
    return res.status(200).json({ message: 'Déconnexion via Supabase Auth' });
  }

  // ─── ME ───────────────────────────────────────────────────────────────────────
  // Retourne le profil métier de l'utilisateur connecté.
  // requireAuth vérifie le token Supabase et charge public.users via auth_id.
  if (action === 'me' && req.method === 'GET') {
    return requireAuth(async (req, res) => {
      return res.status(200).json(req.user);
    })(req, res);
  }
/*********************************************
            GESTION DE L'INSCRIPTION 
    *********************************************/

// ─── LISTE DEMANDES (superadmin) ─────────────────────────────────────────
if (action === 'demandes' && req.method === 'GET') {
  return requireAuth(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin requis' });
    }
    const pool = require('../_lib/db');
    const result = await pool.query(
      `SELECT id, username, prenom, nom, telephone, email, message, statut, created_at
       FROM demandes_inscription
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  })(req, res);
}
  // ─── SIGNUP REQUEST ──────────────────────────────────────────────────────────
if (action === 'register' && req.method === 'POST') {
  const { username, password, prenom, nom, telephone, email, message } = req.body;

  if (!username || !password || !prenom || !nom || !telephone) {
    return res.status(400).json({ message: 'Champs obligatoires manquants' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Mot de passe trop court (min. 6 caractères)' });
  }

  const pool = require('../_lib/db');
  try {
    // Vérifier unicité username
    const exists = await pool.query(
  `SELECT 1 FROM demandes_inscription WHERE username = $1
   UNION ALL
   SELECT 1 FROM users WHERE username = $1`,
  [username]
);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà utilisé' });
    }

    // Stocker la demande (mot de passe hashé)
    const crypto = require('crypto');
    const passwordHash = crypto.createHmac('sha256', process.env.JWT_SECRET || 'nfbo_secret')
      .update(password).digest('hex');

    const result = await pool.query(
      `INSERT INTO demandes_inscription
         (username, prenom, nom, telephone, email, message, mot_de_passe_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [username, prenom, nom, telephone, email || null, message || null, passwordHash]
    );
    const demandeId = result.rows[0].id;

    // Notifier le(s) superadmin(s)
    const admins = await pool.query(
      `SELECT id FROM users WHERE role = 'superadmin' AND statut = 'actif'`
    );
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO messages
           (expediteur_id, destinataire_id, objet, contenu, topic, type_notification)
         VALUES ($1,$2,$3,'inscription','info')`,
        [
          admin_id, admin.id,
          `📝 Nouvelle demande d'inscription — ${prenom} ${nom}`,
          `L'utilisateur "${username}" (${prenom} ${nom}, tél: ${telephone}${email ? ', email: ' + email : ''}) souhaite rejoindre NFBO.\n\nMessage : ${message || '—'}\n\nDemande #${demandeId} — à traiter dans Administration.`,
        ]
      );
    }

    return res.status(201).json({
      message: 'Demande envoyée ! Un administrateur examinera votre demande et vous contactera.',
    });

  } catch (err) {
    console.error('Erreur signup-request:', err.message);
    return res.status(500).json({ message: 'Erreur serveur', details: err.message });
  }
}

// ─── APPROUVER UNE DEMANDE (superadmin seulement) ─────────────────────────
if (action === 'approuver' && req.method === 'POST') {
  return requireAuth(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin requis' });
    }

    const { demande_id, role, magasin_id } = req.body;
    if (!demande_id || !role) {
      return res.status(400).json({ message: 'demande_id et role requis' });
    }

    const pool = require('../_lib/db');
    const { createClient } = require('@supabase/supabase-js');

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
      // Charger la demande
      const demandeRes = await pool.query(
        'SELECT * FROM demandes_inscription WHERE id = $1 AND statut = $2',
        [demande_id, 'en_attente']
      );
      if (!demandeRes.rows[0]) {
        return res.status(404).json({ message: 'Demande introuvable ou déjà traitée' });
      }
      const d = demandeRes.rows[0];

      // Email Supabase — fictif si absent
      const authEmail = d.email ||
        `${d.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@nfbo.local`;

      // Créer dans Supabase Auth
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email:         authEmail,
          password:      d.mot_de_passe_hash, // hash utilisé comme password temporaire
          email_confirm: !d.email,
          user_metadata: { username: d.username, prenom: d.prenom, nom: d.nom },
        });

      if (authError) throw authError;
      const authId = authData.user.id;

      // Insérer dans public.users
      await pool.query(
        `INSERT INTO users
           (auth_id, username, prenom, nom, telephone, email, role, magasin_id, statut)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'actif')`,
        [authId, d.username, d.prenom, d.nom,
         d.telephone, d.email || null, role, magasin_id || null]
      );

      // Marquer la demande approuvée
      await pool.query(
        `UPDATE demandes_inscription SET statut = 'approuvée' WHERE id = $1`,
        [demande_id]
      );

      // Envoyer email de confirmation si email réel
      if (d.email) {
        await supabaseAdmin.auth.admin.generateLink({
          type:  'signup',
          email: authEmail,
        });
      }

      return res.json({ message: `Compte de ${d.prenom} ${d.nom} créé avec succès.` });

    } catch (err) {
      console.error('Erreur approbation:', err.message);
      return res.status(500).json({ message: 'Erreur lors de l\'approbation', details: err.message });
    }
  })(req, res);
}

// ─── REJETER UNE DEMANDE ──────────────────────────────────────────────────
if (action === 'rejeter' && req.method === 'POST') {
  return requireAuth(async (req, res) => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin requis' });
    }
    const { demande_id, motif } = req.body;
    const pool = require('../_lib/db');
    await pool.query(
      `UPDATE demandes_inscription SET statut = 'rejetée' WHERE id = $1`,
      [demande_id]
    );
    return res.json({ message: 'Demande rejetée.' });
  })(req, res);
}

  // ─── CONFIRM ─────────────────────────────────────────────────────────────────
  // Supabase gère la confirmation email automatiquement.
  if (action === 'confirm') {
    const appUrl = process.env.APP_URL || 'https://nfbo.vercel.app';
    return res.redirect(302, `${appUrl}/dashboard?confirmed=1`);
  }

  return res.status(405).json({ message: `Route non supportée : ${req.method} ${url}` });
});