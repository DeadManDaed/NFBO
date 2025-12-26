// server/validators/validate.js
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({allErrors: true, 
    removeAdditional: false, 
    allowUnionTypes: true});
addFormats(ajv);

const lotSchema = require('./lotSchema.json');

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



const validateLotDef = ajv.compile(lotSchema);
const validateAdm = ajv.compile(admissionSchema);

function validateLot(req, res, next) {
    const validate = ajv.compile(lotSchema);
    const valid = validate(req.body);

    if (!valid) {
        // Extraction des messages d'erreur lisibles
        const errors = validate.errors.map(err => {
            return `${err.instancePath.replace('/', '')} ${err.message}`;
        }).join(', ');

        console.error('❌ Échec de validation du lot:', errors);
        return res.status(400).json({ 
            success: false, 
            message: "Données invalides : " + errors 
        });
    }

    // Si c'est valide, on passe à la suite (la route SQL)
    next();
}

function validateAdmission(req, res, next) {
  const valid = validateAdm(req.body);
  if (valid) return next();
  const errors = validateAdm.errors.map(e => `${e.instancePath.replace(/^\//, '')} ${e.message}`);
  return res.status(400).json({ message: 'Payload invalide (Admission)', errors });
}

module.exports = { validateLot, validateAdmission };


