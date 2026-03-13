// api/_handlers/auth/callback.js
const { v4: uuidv4 } = require('uuid');
const { serialize } = require('cookie');
const { setSession } = require('./session');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';
const COOKIE_SECURE = (process.env.COOKIE_SECURE || 'true') === 'true';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Strict';
const APP_URL = process.env.APP_URL || '/';
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

module.exports = async function handleCallback(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (error) return res.status(400).send(`Auth error: ${url.searchParams.get('error_description') || error}`);
    if (!code) return res.status(400).send('Missing code');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code
      // redirect_uri: add if required by your Supabase settings
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
    if (tokens.error) return res.status(400).json(tokens);

    const sessionId = uuidv4();
    const sessionData = {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
      user: tokens.user || null
    };

    await setSession(sessionId, sessionData, SESSION_TTL_SECONDS);
    setSessionCookie(res, sessionId);

    res.writeHead(302, { Location: APP_URL });
    res.end();
  } catch (err) {
    console.error('auth callback error', err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
};