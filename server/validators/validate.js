// server/validators/validate.js
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

const lotSchema = require('./lotSchema.json');

// Schéma d'admission mis à jour pour la reprise
const admissionSchema = {
  type: 'object',
  properties: {
    lot_id: { type: ['integer', 'string'] },
    producteur_id: { type: 'string' }, // Accepte vos IDs type "PRD-XXX"
    quantite: { type: 'number' },
    unite: { type: 'string' },
    prix_unitaire: { type: 'number' },
    qualite: { type: 'string' },
    magasin_id: { type: ['integer', 'string'] },
    date_expiration: { type: ['string', 'null'] },
    utilisateur: { type: 'string' }
  },
  // On a bien retiré 'categorie' et 'prix_ref' qui causaient l'erreur
  required: ['lot_id', 'producteur_id', 'quantite', 'unite', 'magasin_id'],
  additionalProperties: true 
};

const validateLotDef = ajv.compile(lotSchema);
const validateAdm = ajv.compile(admissionSchema);

function validateLotDefinition(req, res, next) {
  const valid = validateLotDef(req.body);
  if (valid) return next();
  const errors = validateLotDef.errors.map(e => `${e.instancePath.replace(/^\//, '')} ${e.message}`);
  return res.status(400).json({ message: 'Payload invalide (Lot)', errors });
}

function validateAdmission(req, res, next) {
  const valid = validateAdm(req.body);
  if (valid) return next();
  const errors = validateAdm.errors.map(e => `${e.instancePath.replace(/^\//, '')} ${e.message}`);
  return res.status(400).json({ message: 'Payload invalide (Admission)', errors });
}

module.exports = { validateLotDefinition, validateAdmission };
