const { requireAuth } = require('./_lib/auth');
const { withCors }    = require('./_lib/cors');

const routes = {
  '/api/admissions':        () => require('./admissions'),
  '/api/audit':             () => require('./audit'),
  '/api/geo':               () => require('./geo'),
  '/api/lots':              () => require('./lots/index'),
  '/api/magasins':          () => require('./magasins'),
  '/api/messages':          () => require('./messages'),
  '/api/operations_caisse': () => require('./operations_caisse'),
  '/api/personnel':         () => require('./personnel/index'),
  '/api/employers':         () => require('./personnel/index'),
  '/api/users':             () => require('./personnel/index'),
  '/api/producteurs':       () => require('./producteurs'),
  '/api/retraits':          () => require('./retraits'),
  '/api/transferts':        () => require('./transferts'),
  '/api/auth':              () => require('./auth/index'),
};
module.exports = withCors(async (req, res) => {
  const path = req.url.split('?')[0];

  // Trouver la route correspondante
  const matchKey = Object.keys(routes).find(k => path.startsWith(k));
  if (!matchKey) {
    return res.status(404).json({ error: `Route introuvable : ${path}` });
  }

  const handler = routes[matchKey]();
  return handler(req, res);
});
