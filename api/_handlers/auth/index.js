// api/_handlers/auth/index.js
const path = require('path');

const handleCallback = require('./callback');
const handleRefresh = require('./refresh');
const handleLogout = require('./logout');

module.exports = (req, res) => {
  // Normaliser le path : on veut gérer /callback, /refresh, /logout
  const urlPath = req.url.split('?')[0] || '';
  const p = urlPath.replace(/\/+$/, ''); // enlever slash final

  // Accepter /callback ou /api/auth/callback selon dispatcher
  if (req.method === 'GET' && (p === '/callback' || p.endsWith('/callback') || p === '/api/auth/callback')) {
    return handleCallback(req, res);
  }
  if (req.method === 'POST' && (p === '/refresh' || p === '/api/auth/refresh')) {
    return handleRefresh(req, res);
  }
  if (req.method === 'POST' && (p === '/logout' || p === '/api/auth/logout')) {
    return handleLogout(req, res);
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: `Route introuvable: ${p}` }));
};