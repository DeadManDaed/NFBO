// validators/validate.js
// ... (imports ajv et fs)
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

// Importation directe des schémas (Node.js gère le JSON automatiquement avec require)
const lotSchema = require('./lotSchema');
const admissionSchema = require('./admissionSchema');

// Compilation des validateurs
const validateLotDef = ajv.compile(lotSchema);
const validateAdm = ajv.compile(admissionSchema);

/**
 * Middleware pour valider la DÉFINITION d'un lot (Utilisé dans routes/lots.js)
 */
function validateLotDefinition(req, res, next) {
  const valid = validateLotDef(req.body);
  if (valid) return next();

  const errors = validateLotDef.errors.map(e => {
    const field = e.instancePath ? e.instancePath.replace(/^\//, '') : e.params?.missingProperty || '';
    return `${field} ${e.message}`;
  });

  return res.status(400).json({ message: 'Payload invalide (Définition Lot)', errors });
}

/**
 * Middleware pour valider l'ADMISSION en stock (Utilisé dans routes/admissions.js)
 */
function validateAdmission(req, res, next) {
  const valid = validateAdm(req.body);
  if (valid) return next();

  const errors = validateAdm.errors.map(e => {
    const field = e.instancePath ? e.instancePath.replace(/^\//, '') : e.params?.missingProperty || '';
    return `${field} ${e.message}`;
  });

  return res.status(400).json({ message: 'Payload invalide (Admission)', errors });
}

module.exports = { 
  validateLotDefinition, 
  validateAdmission 
};

module.exports = { validateLotDefinition, validateAdmission };



