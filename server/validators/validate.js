// validators/validate.js
// ... (imports ajv et fs)
const defSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'lotSchema.json'), 'utf8'));
const admSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'admissionSchema.json'), 'utf8'));

const Ajv = require('ajv'); // Retrait du .default ici
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

// Initialisation adaptée à Ajv v6 ou v8
const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

function validateLotDefinition(req, res, next) {
  const valid = validateDef(req.body);
  if (valid) return next();
  // ... renvoyer les erreurs de validateDef.errors
}

function validateAdmission(req, res, next) {
  const valid = validateAdm(req.body);
  if (valid) return next();
  // ... renvoyer les erreurs de validateAdm.errors
}

module.exports = { validateLotDefinition, validateAdmission };


