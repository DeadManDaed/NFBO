// api/_handlers/proxy.js
const { parse } = require('cookie');
const { getSession } = require('./auth/session');

module.exports = async function proxyHandler(req, res) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;
    if (!sessionId) return res.status(401).json({ error: 'no_session' });

    const session = await getSession(sessionId);
    if (!session) return res.status(401).json({ error: 'invalid_session' });

    // Option: auto-refresh here if expired (call /api/auth/refresh internally)
    if (Date.now() > session.expires_at - 5000) {
      return res.status(401).json({ error: 'token_expired' });
    }

    // Exemple de proxy vers une API protégée
    const apiResp = await fetch('https://example.api/protected', {
      method: req.method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': req.headers['content-type'] || 'application/json'
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req
    });

    const text = await apiResp.text();
    res.status(apiResp.status).send(text);
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'server_error' });
  }
};