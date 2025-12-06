// validators/validate.js
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'lotSchema.json'), 'utf8'));
const validate = ajv.compile(schema);

function validateLot(req, res, next) {
  const valid = validate(req.body);
  if (valid) return next();

  const errors = validate.errors.map(e => {
    const field = e.instancePath ? e.instancePath.replace(/^\//, '') : e.params?.missingProperty || '';
    return `${field} ${e.message}`;
  });
  return res.status(400).json({ message: 'Payload invalide', errors });
}

module.exports = { validateLot };
