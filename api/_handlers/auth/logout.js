// api/_handlers/auth/logout.js
const { parse } = require('cookie');
const { getSession, deleteSession } = require('./session');

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
    res.setHeader('Set-Cookie', `session_id=; HttpOnly; Max-Age=0; Path=/;`);
    res.statusCode = 204;
    res.end();
  } catch (err) {
    console.error('auth logout error', err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
};