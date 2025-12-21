// validators/validate.js
// ... (imports ajv et fs)
const defSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'definitionSchema.json'), 'utf8'));
const admSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'admissionSchema.json'), 'utf8'));

const validateDef = ajv.compile(defSchema);
const validateAdm = ajv.compile(admSchema);

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

