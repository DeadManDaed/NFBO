// api/_lib/auth.js
// Utilitaires JWT légers — pas de dépendance externe, on utilise
// le module natif 'crypto' de Node.js (disponible sur Vercel).
//
// Format du token : base64(header).base64(payload).signature HMAC-SHA256
// C'est un JWT "maison" compatible avec le standard mais sans jsonwebtoken.

const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'changeme_en_prod';
const EXPIRES_IN = 60 * 60 * 8; // 8 heures en secondes

// ─── Encodage base64url (compatible JWT) ──────────────────────────────────────
function b64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// ─── Signature HMAC-SHA256 ────────────────────────────────────────────────────
function sign(input) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(input)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// ─── Créer un token ───────────────────────────────────────────────────────────
function createToken(payload) {
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + EXPIRES_IN,
  }));
  const sig = sign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

// ─── Vérifier et décoder un token ────────────────────────────────────────────
// Retourne le payload décodé, ou lève une erreur.
function verifyToken(token) {
  if (!token) throw new Error('Token manquant');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Format de token invalide');

  const [header, body, sig] = parts;
  const expectedSig = sign(`${header}.${body}`);

  // Comparaison sécurisée (résiste aux timing attacks)
  const sigBuf      = Buffer.from(sig,         'base64');
  const expectedBuf = Buffer.from(expectedSig, 'base64');
  if (sigBuf.length !== expectedBuf.length) throw new Error('Signature invalide');
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) throw new Error('Signature invalide');

  const payload = JSON.parse(Buffer.from(body, 'base64').toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expiré');

  return payload;
}

// ─── Middleware Vercel ────────────────────────────────────────────────────────
// Utilisation :
//   const { requireAuth } = require('../_lib/auth');
//   module.exports = withCors(requireAuth(async (req, res) => { ... }));
//
// req.user sera disponible dans le handler :
//   { id, username, role, magasin_id }

function requireAuth(handler, { roles } = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      req.user = verifyToken(token);

      // Vérification de rôle optionnelle
      if (roles && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Accès refusé : rôle insuffisant' });
      }

      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ message: `Non autorisé : ${err.message}` });
    }
  };
}

module.exports = { createToken, verifyToken, requireAuth };
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { createToken, verifyToken } = require('../_lib/auth');