// api/_handlers/auth/index.js
const path = require('path');

const handleCallback = require('./callback');
const handleRefresh = require('./refresh');
const handleLogout = require('./logout');

module.exports = (req, res) => {
  const p = req.url.split('?')[0];
  if (req.method === 'GET' && p.startsWith('/api/auth/callback')) {
    return handleCallback(req, res);
  }
  if (req.method === 'POST' && p === '/api/auth/refresh') {
    return handleRefresh(req, res);
  }
  if (req.method === 'POST' && p === '/api/auth/logout') {
    return handleLogout(req, res);
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: `Route introuvable: ${p}` }));
};