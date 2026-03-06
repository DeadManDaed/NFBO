// api/_lib/auth.js
// Vérification des tokens Supabase Auth côté backend Vercel.
// Le token JWT est émis par Supabase et signé avec le JWT_SECRET du projet.
// On vérifie la signature et on charge le profil depuis public.users.

const crypto = require('crypto');
const pool   = require('./db');

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

function b64decode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function verifySupabaseToken(token) {
  if (!token) throw new Error('Token manquant');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Format de token invalide');

  const [header, body, sig] = parts;

  const secretBuffer = Buffer.from(SUPABASE_JWT_SECRET, 'base64');

  const expectedSig = crypto
    .createHmac('sha256', secretBuffer)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf      = Buffer.from(sig,         'base64');
  const expectedBuf = Buffer.from(expectedSig, 'base64');

  if (sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Signature invalide');
  }

  const payload = JSON.parse(b64decode(body));
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expiré');
  }

  return payload;
}

function requireAuth(handler, { roles } = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      const payload = verifySupabaseToken(token);
      const authId  = payload.sub;

      const result = await pool.query(
        `SELECT id, auth_id, username, role, magasin_id, prenom, nom, email, statut
         FROM public.users
         WHERE auth_id = $1 AND statut = 'actif'`,
        [authId]
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