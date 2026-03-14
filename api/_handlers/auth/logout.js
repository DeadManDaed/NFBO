// api/_handlers/auth/logout.js
const { parse, serialize } = require('cookie');
const { getSession, deleteSession } = require('./session');

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';
const COOKIE_SECURE = (process.env.COOKIE_SECURE || 'true') === 'true';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Strict';

function clearSessionCookie(res) {
  const cookie = serialize('session_id', '', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 0
  });
  res.setHeader('Set-Cookie', cookie);
}

module.exports = async function handleLogout(req, res) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;
    if (sessionId) {
      const session = await getSession(sessionId);
      if (session && session.access_token) {
        // Optionnel : appeler endpoint de logout/revoke si ton provider le supporte
        // await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }});
      }
      await deleteSession(sessionId);
    }
    clearSessionCookie(res);
    res.statusCode = 204;
    res.end();
  } catch (err) {
    console.error('auth logout error', err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
};