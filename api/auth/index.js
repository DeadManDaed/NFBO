// api/auth/index.js  →  Gère POST /api/auth/login | POST /api/auth/logout | GET /api/auth/me
// Une seule Vercel Serverless Function pour les 3 routes d'authentification.

const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { createToken, verifyToken } = require('../_lib/auth');
const { sendConfirmationEmail }    = require('../_lib/mailer');

module.exports = withCors(async (req, res) => {
  // Routage interne basé sur la méthode et le suffixe d'URL
  // /api/auth/login  → POST
  // /api/auth/logout → POST
  // /api/auth/me     → GET
  const url = req.url?.split('?')[0].replace(/\/$/, ''); // ex: "/api/auth/login"
  const action = url.split('/').pop(); // "login" | "logout" | "me"

// DEBUG TEMPORAIRE
  if (action === 'debug-env') {
    return res.json({
      has_db_url:   !!process.env.DATABASE_URL,
      db_start: (process.env.DATABASE_URL || 'NON DEFINIE').substring(0, 120),
      has_app_url:  !!process.env.APP_URL,
      app_url:      process.env.APP_URL || 'NON DEFINIE',
      node_env:     process.env.NODE_ENV,
    });
  }
  // ─── LOGIN ───────────────────────────────────────────────────────────────────
  if (action === 'login' && req.method === 'POST') {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
    }

    try {
      const result = await pool.query(
        `SELECT id, username, role, magasin_id
         FROM users
         WHERE username = $1
           AND password_hash = crypt($2, password_hash)
           AND statut = 'actif'`,
        [username, password]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Identifiants incorrects ou compte inactif' });
      }

      const user = result.rows[0];
      const token = createToken({
        id:         user.id,
        username:   user.username,
        role:       user.role,
        magasin_id: user.magasin_id || null,
      });

      // Mettre à jour last_login
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      return res.status(200).json({
        token,
        user: {
          id:         user.id,
          username:   user.username,
          role:       user.role,
          magasin_id: user.magasin_id || null,
        },
      });
    } catch (err) {
      console.error('[auth/login] Erreur:', err.message);
      return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
  }
// ─── REGISTER ────────────────────────────────────────────────────────────────
  if (action === 'register' && req.method === 'POST') {
    const { username, password, prenom, nom, telephone, email } = req.body || {};

    if (!username || !password || !prenom || !nom || !telephone) {
      return res.status(400).json({ message: 'Champs obligatoires manquants (username, password, prenom, nom, telephone)' });
    }

    try {
      // Vérifier unicité username
      const checkUser = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
      if (checkUser.rows.length > 0) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris' });
      }

      // Vérifier unicité email si fourni
      if (email) {
        const checkEmail = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
        if (checkEmail.rows.length > 0) {
          return res.status(400).json({ message: 'Cette adresse email est déjà utilisée' });
        }
      }

      // Créer le compte avec statut 'en_attente' et rôle 'stock' par défaut
      const result = await pool.query(
        `INSERT INTO users (username, password_hash, prenom, nom, telephone, email, role, statut)
         VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5, $6, 'stock', 'en_attente')
         RETURNING id, username, prenom, nom, email, statut`,
        [username, password, prenom, nom, telephone, email || null]
      );

      const newUser = result.rows[0];

      // Envoi email de confirmation si email fourni
      if (email) {
        const confirmToken = createToken({ id: newUser.id, action: 'confirm_email' });
        const appUrl = process.env.APP_URL || 'https://nfbo.vercel.app';
        const confirmUrl = `${appUrl}/api/auth/confirm?token=${confirmToken}`;

        // Log du lien en console (à remplacer par un vrai envoi email)
        console.log(`[register] Lien de confirmation pour ${email} : ${confirmUrl}`);

      try {
          await sendConfirmationEmail(email, prenom, confirmUrl);
        } catch (mailErr) {
          // L'email a échoué mais le compte est créé — on log sans bloquer
          console.error('[register] Échec envoi email de confirmation:', mailErr.message);
        }
}
      return res.status(201).json({
        message: email
          ? 'Compte créé. Vérifiez votre email pour confirmer votre adresse.'
          : 'Compte créé. Un administrateur doit l\'activer avant votre première connexion.',
        user: newUser,
      });

    } catch (err) {
      console.error('[auth/register] Erreur:', err.message);
      if (err.code === '23505') {
        return res.status(400).json({ message: 'Username ou email déjà utilisé' });
      }
      return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
  }

  // ─── CONFIRM EMAIL ───────────────────────────────────────────────────────────
  if (action === 'confirm' && req.method === 'GET') {
    const { token } = req.query;
    try {
      const payload = verifyToken(token);

      if (payload.action !== 'confirm_email') {
        return res.status(400).json({ message: 'Token invalide' });
      }

      await pool.query(
        `UPDATE users SET statut='actif', email_confirmed=true WHERE id=$1`,
        [payload.id]
      );

      // Redirection vers le dashboard de production
      const appUrl = process.env.APP_URL || 'https://nfbo.vercel.app';
      return res.redirect(302, `${appUrl}/dashboard?confirmed=1`);

    } catch (err) {
      return res.status(400).json({ message: `Lien invalide ou expiré : ${err.message}` });
    }
  }
  // ─── LOGOUT ──────────────────────────────────────────────────────────────────
  if (action === 'logout' && req.method === 'POST') {
    // TODO: invalider le JWT si implémenté côté serveur
    return res.status(200).json({ message: 'Déconnexion réussie' });
  }

  // ─── ME ───────────────────────────────────────────────────────────────────────
  if (action === 'me' && req.method === 'GET') {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const payload = verifyToken(token);

      // Récupérer les infos fraîches depuis la DB
      const result = await pool.query(
        `SELECT id, username, role, magasin_id, prenom, nom, email, statut
         FROM users WHERE id = $1 AND statut = 'actif'`,
        [payload.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Utilisateur introuvable ou inactif' });
      }

      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(401).json({ message: `Non autorisé : ${err.message}` });
    }
  }

  // ─── ROUTE INCONNUE ───────────────────────────────────────────────────────────
  return res.status(405).json({ message: `Méthode ou route non supportée : ${req.method} ${url}` });
});
