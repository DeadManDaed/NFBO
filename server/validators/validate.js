// validators/validate.js
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

const lotSchema = require('./lotSchema.json');
// On ne charge plus l'ancien admissionSchema.json problématique

// Nouveau schéma d'admission flexible
const admissionSchema = {
  type: 'object',
  properties: {
    lot_id: { type: ['integer', 'string'] },
    producteur_id: { type: 'string' }, // Accepte vos IDs personnalisés
    quantite: { type: 'number' },
    unite: { type: 'string' },
    prix_unitaire: { type: 'number' },
    qualite: { type: 'string' },
    magasin_id: { type: ['integer', 'string'] },
    date_expiration: { type: ['string', 'null'] },
    utilisateur: { type: 'string' }
  },
  // On retire categorie et prix_ref des requis
  required: ['lot_id', 'producteur_id', 'quantite', 'unite', 'magasin_id'],
  additionalProperties: true // Évite l'erreur "must NOT have additional properties"
};

const validateLotDef = ajv.compile(lotSchema);
const validateAdm = ajv.compile(admissionSchema); // Compile le nouveau schéma

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




