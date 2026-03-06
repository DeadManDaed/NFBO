// api/index.js
const { withCors } = require('./_lib/cors');

const routes = {
  '/api/admissions':        () => require('./_handlers/admissions'),
  '/api/audit':             () => require('./_handlers/audit'),
  '/api/geo':               () => require('./_handlers/geo'),
  '/api/lots':              () => require('./lots/index'),
  '/api/magasins':          () => require('./_handlers/magasins'),
  '/api/messages':          () => require('./_handlers/messages'),
  '/api/operations_caisse': () => require('./_handlers/operations_caisse'),
  '/api/personnel':         () => require('./personnel/index'),
  '/api/employers':         () => require('./personnel/index'),
  '/api/users':             () => require('./personnel/index'),
  '/api/producteurs':       () => require('./_handlers/producteurs'),
  '/api/retraits':          () => require('./_handlers/retraits'),
  '/api/transferts':        () => require('./_handlers/transferts'),
  '/api/auth':              () => require('./auth/index'),
};

module.exports = withCors(async (req, res) => {
  const path = req.url.split('?')[0];
  const matchKey = Object.keys(routes).find(k => path.startsWith(k));
  if (!matchKey) {
    return res.status(404).json({ error: `Route introuvable : ${path}` });
  }
  return routes[matchKey]()(req, res);
});