// api/_lib/cors.js
// Helper CORS à appeler en tête de chaque handler

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-role');
}

// Wrapper qui gère OPTIONS automatiquement
function withCors(handler) {
  return async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    return handler(req, res);
  };
}

module.exports = { setCors, withCors };