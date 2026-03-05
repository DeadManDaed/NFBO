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

  // ─── REGISTER ────────────────────────────────────────────────────────────────
  // L'inscription est gérée via Supabase Auth Dashboard ou invitation.
  if (action === 'register') {
    return res.status(410).json({ message: 'Inscription gérée par Supabase Auth' });
  }

  // ─── CONFIRM ─────────────────────────────────────────────────────────────────
  // Supabase gère la confirmation email automatiquement.
  if (action === 'confirm') {
    const appUrl = process.env.APP_URL || 'https://nfbo.vercel.app';
    return res.redirect(302, `${appUrl}/dashboard?confirmed=1`);
  }

  return res.status(405).json({ message: `Route non supportée : ${req.method} ${url}` });
});