// api/_lib/auth.js
const pool = require('./db');

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function requireAuth(handler, { roles } = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      if (!token) throw new Error('Token manquant');

      // Vérification via Supabase Admin
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) throw new Error('Token invalide');

      // Charger le profil métier
      const result = await pool.query(
        `SELECT id, auth_id, username, role, magasin_id, prenom, nom, email, statut
         FROM public.users
         WHERE auth_id = $1 AND statut = 'actif'`,
        [user.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Utilisateur introuvable ou inactif' });
      }

      req.user = result.rows[0];

      if (roles && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Accès refusé : rôle insuffisant' });
      }

      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ message: `Non autorisé : ${err.message}` });
    }
  };
}

function createToken() { throw new Error('createToken: utiliser Supabase Auth'); }
function verifyToken()  { throw new Error('verifyToken: utiliser Supabase Auth'); }

module.exports = { createToken, verifyToken, requireAuth };