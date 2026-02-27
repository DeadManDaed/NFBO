// api/auth/index.js  →  Gère POST /api/auth/login | POST /api/auth/logout | GET /api/auth/me
// Une seule Vercel Serverless Function pour les 3 routes d'authentification.

const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');

module.exports = withCors(async (req, res) => {
  // Routage interne basé sur la méthode et le suffixe d'URL
  // /api/auth/login  → POST
  // /api/auth/logout → POST
  // /api/auth/me     → GET
  const url = req.url?.split('?')[0].replace(/\/$/, ''); // ex: "/api/auth/login"
  const action = url.split('/').pop(); // "login" | "logout" | "me"

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
      return res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          magasin_id: user.magasin_id || null,
        },
      });
    } catch (err) {
      console.error('[auth/login] Erreur:', err.message);
      return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
  }

  // ─── LOGOUT ──────────────────────────────────────────────────────────────────
  if (action === 'logout' && req.method === 'POST') {
    // TODO: invalider le JWT si implémenté côté serveur
    return res.status(200).json({ message: 'Déconnexion réussie' });
  }

  // ─── ME ───────────────────────────────────────────────────────────────────────
  if (action === 'me' && req.method === 'GET') {
    // TODO: décoder un JWT depuis Authorization header
    // const token = req.headers.authorization?.split(' ')[1];
    // const user = verifyJWT(token);
    return res.status(200).json({
      id: 1,
      username: 'admin',
      role: 'superadmin',
      magasin_id: 1,
      nom: 'Administrateur',
    });
  }

  // ─── ROUTE INCONNUE ───────────────────────────────────────────────────────────
  return res.status(405).json({ message: `Méthode ou route non supportée : ${req.method} ${url}` });
});
