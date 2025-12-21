// validators/validate.js
// ... (imports ajv et fs)
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

// Importation des fichiers JSON (Node les gère comme des objets avec require)
const lotSchema = require('./lotSchema.json');
const admissionSchema = require('./admissionSchema.json');

const validateLotDef = ajv.compile(lotSchema);
const validateAdm = ajv.compile(admissionSchema);

function validateLotDefinition(req, res, next) {
  const valid = validateLotDef(req.body);
  if (valid) return next();
  const errors = validateLotDef.errors.map(e => `${e.instancePath.replace(/^\//, '')} ${e.message}`);
  return res.status(400).json({ message: 'Payload invalide (Définition)', errors });
}

function validateAdmission(req, res, next) {
  const valid = validateAdm(req.body);
  if (valid) return next();
  const errors = validateAdm.errors.map(e => `${e.instancePath.replace(/^\//, '')} ${e.message}`);
  return res.status(400).json({ message: 'Payload invalide (Admission)', errors });
}

module.exports = { validateLotDefinition, validateAdmission };





