// api/_handlers/auth/refresh.js
const { parse, serialize } = require('cookie');
const { getSession, setSession, deleteSession } = require('./session');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';
const COOKIE_SECURE = (process.env.COOKIE_SECURE || 'true') === 'true';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Strict';
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 30);

function setSessionCookie(res, sessionId) {
  const cookie = serialize('session_id', sessionId, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  });
  res.setHeader('Set-Cookie', cookie);
}

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

module.exports = async function handleRefresh(req, res) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;
    if (!sessionId) return res.status(401).json({ error: 'no_session' });

    const session = await getSession(sessionId);
    if (!session || !session.refresh_token) {
      await deleteSession(sessionId);
      clearSessionCookie(res);
      return res.status(401).json({ error: 'invalid_session' });
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refresh_token
    });

    const tokenResp = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const tokens = await tokenResp.json();
    if (tokens.error) {
      await deleteSession(sessionId);
      clearSessionCookie(res);
      return res.status(401).json(tokens);
    }

    const newRefresh = tokens.refresh_token || session.refresh_token;
    const newSession = {
      ...session,
      refresh_token: newRefresh,
      access_token: tokens.access_token,
      expires_at: Date.now() + (tokens.expires_in || 3600) * 1000
    };
    await setSession(sessionId, newSession, SESSION_TTL_SECONDS);

    setSessionCookie(res, sessionId);

    res.json({ access_token: tokens.access_token, expires_in: tokens.expires_in });
  } catch (err) {
    console.error('auth refresh error', err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
};