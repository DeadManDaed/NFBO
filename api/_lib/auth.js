// api/_lib/auth.js
const pool = require('./db');
const { parse: parseCookie } = require('cookie');
const { createClient } = require('@supabase/supabase-js');

// Client Supabase admin (tolérance VITE_SUPABASE_URL pour compatibilité)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAdmin = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Utilitaires de session serveur (si présents)
let sessionStore;
try {
  sessionStore = require('../_handlers/auth/session');
} catch (e) {
  // si absent, on continue ; la validation tombera sur le token Authorization
  sessionStore = null;
}

/**
 * requireAuth hybride
 * - accepte d'abord cookie session_id (session serveur)
 * - sinon accepte Authorization: Bearer <token> (Supabase)
 *
 * handler: fonction (req, res) => {}
 * options.roles: tableau de rôles autorisés (ex: ['admin','superadmin'])
 */
function requireAuth(handler, { roles } = {}) {
  return async (req, res) => {
    try {
      // 1) Tentative via cookie session_id
      try {
        const cookieHeader = req.headers.cookie || '';
        const cookies = cookieHeader ? parseCookie(cookieHeader) : {};
        const sessionId = cookies.session_id || null;

        if (sessionId && sessionStore && typeof sessionStore.getSession === 'function') {
          const sess = await sessionStore.getSession(sessionId);
          if (sess) {
            // Si la session contient déjà l'user (créée par callback), on l'utilise
            if (sess.user && sess.user.id) {
              req._auth_source = 'session_cookie';
              req.user = { auth_id: sess.user.id, ...sess.user };
            } else if (sess.access_token) {
              // Sinon, valider le token contenu dans la session via Supabase
              const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(sess.access_token);
              if (!userErr && userData?.user) {
                req._auth_source = 'session_cookie_token';
                req.user = { auth_id: userData.user.id, ...userData.user };
              }
            }
          }
        }
      } catch (e) {
        // Ne pas échouer complètement si la lecture de session plante ; on essaiera le header
        console.error('[auth] session cookie check error:', e && e.stack ? e.stack : e);
      }

      // 2) Si pas d'utilisateur trouvé via cookie, tenter Authorization header
      if (!req.user) {
        const authHeader = (req.headers['authorization'] || req.headers['Authorization'] || '').toString();
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
          throw new Error('Aucune session valide trouvée (cookie ou header manquant)');
        }

        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData?.user) {
          throw new Error('Token invalide');
        }

        req._auth_source = 'authorization_header';
        req.user = { auth_id: userData.user.id, ...userData.user };
      }

      // 3) Charger le profil métier depuis public.users
      const result = await pool.query(
        `SELECT id, auth_id, username, role, magasin_id, prenom, nom, email, statut
         FROM public.users
         WHERE auth_id = $1 AND statut = 'actif'`,
        [req.user.auth_id]
      );

      if (!result || result.rows.length === 0) {
        return res.status(401).json({ message: 'Utilisateur introuvable ou inactif' });
      }

      // Remplacer req.user par le profil métier (conserver auth source si utile)
      req.user = { ...result.rows[0], _auth_source: req._auth_source };

      // 4) Vérifier les rôles si demandés
      if (roles && Array.isArray(roles) && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Accès refusé : rôle insuffisant' });
      }

      // 5) Appeler le handler
      return handler(req, res);
    } catch (err) {
      // Log utile pour debug en prod
      console.error('[auth] requireAuth error:', err && err.stack ? err.stack : err);
      return res.status(401).json({ message: `Non autorisé : ${err.message || 'accès refusé'}` });
    }
  };
}

// Garder les API existantes pour compatibilité
function createToken() { throw new Error('createToken: utiliser Supabase Auth'); }
function verifyToken()  { throw new Error('verifyToken: utiliser Supabase Auth'); }

console.log('[auth] supabase admin client créé:', !!supabaseAdmin);
console.log('[auth] SUPABASE_URL:', !!SUPABASE_URL);
console.log('[auth] SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = { createToken, verifyToken, requireAuth };