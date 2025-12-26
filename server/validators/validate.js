// server/validators/validate.js
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({allErrors: true, 
    removeAdditional: false, 
    allowUnionTypes: true});
addFormats(ajv);

// Schéma aligné sur votre table SQL
const lotSchema = {
    "type": "object",
    "required": ["description", "categorie", "criteres_admission", "unites_admises", "prix_ref"],
    "properties": {
        "description": { "type": "string", "maxLength": 255 },
        "categorie": { "type": "string", "maxLength": 100 },
        "prix_ref": { "type": "number", "minimum": 0 },
        "unites_admises": { "type": "array", "items": { "type": "string" } },
        "criteres_admission": { "type": "array", "items": { "type": "object" } },
        "notes": { "type": "string" } // Note: n'est pas dans votre table, sera ignoré ou à ajouter
    }
};

const validate = ajv.compile(lotSchema);

function validateLot(req, res, next) {
    const valid = validate(req.body);
    if (!valid) {
        return res.status(400).json({ 
            error: "Validation échouée", 
            details: validate.errors 
        });
    }
    next();
}
// Schéma d'admission mis à jour pour la reprise
/* const admissionSchema = {
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
*/

const admissionSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['lot_id'] // On ne garde que l'ID du lot comme obligatoire
};




const validateAdm = ajv.compile(admissionSchema);

function validateAdmission(req, res, next) {
  const valid = validateAdm(req.body);
  if (valid) return next();
  const errors = validateAdm.errors.map(e => `${e.instancePath.replace(/^\//, '')} ${e.message}`);
  return res.status(400).json({ message: 'Payload invalide (Admission)', errors });
}

module.exports = { validateLot, validateAdmission };



