/**
 * functions.js
 * - computeLotValues: recalcul côté client (affichage)
 * - buildLotDataFromForm: extrait et normalise les champs du DOM en snake_case
 * - createLotFromForm: envoie au backend et gère l'UI
 * - validateLotPayload: validations minimales avant envoi
 *
 * Conventions:
 * - Tous les noms de clés correspondent aux colonnes SQL (snake_case)
 * - Le backend doit recalculer/valider à son tour (sécurité)
 */

/* ---------- Constantes métier ---------- */
const QUAL_COEF = { excellente: 1.00, bonne: 0.95, moyenne: 0.90, A: 1.00, B: 0.95, C: 0.90 };
const TAX_BY_CAT = { frais: 0.25, secs: 0.10, manualim: 0.10, nonalim: 0.10, sensible: 0.25, fruits: 0.10, legumes: 0.10 };

/* ---------- Utilitaires ---------- */
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ---------- Calculs ---------- */
function computeLotValues({ quantite, prix_ref, qualite, categorie }) {
  const qte = toNumber(quantite, 0);
  const prix = toNumber(prix_ref, 0);
  const qualKey = (qualite || '').toString().toLowerCase();
  const catKey = (categorie || '').toString().toLowerCase();

  const coef = QUAL_COEF[qualKey] ?? QUAL_COEF[qualite] ?? 1.0;
  const tax = TAX_BY_CAT[catKey] ?? 0.10;

  const valeur_totale = Number((qte * prix).toFixed(2));
  const benefice_estime = Number(Math.round((valeur_totale * coef) * (1 - tax)));

  return {
    valeur_totale,
    benefice_estime,
    coef_qualite: Number(coef.toFixed(4)),
    taux_tax: Number(tax.toFixed(4))
  };
}

/* ---------- Extraction et normalisation du formulaire ---------- */
function buildLotDataFromForm(formEl) {
  // formEl peut être un <form> ou document
  const get = id => (formEl.querySelector ? formEl.querySelector(`#${id}`) : document.getElementById(id));

  const data = {
    nom_producteur: (get('nomProducteur')?.value || '').trim(),
    tel_producteur: (get('telProducteur')?.value || '').trim(),
    type_producteur: (get('typeProducteur')?.value || '').trim(),
    categorie: (get('categorie')?.value || '').trim(),
    description: (get('description')?.value || '').trim(),
    quantite: toNumber(get('quantiteLot')?.value, 0),
    unite: (get('uniteLot')?.value || '').trim(),
    prix_ref: toNumber(get('prixRef')?.value, 0),
    qualite: (get('qualite')?.value || '').trim(),
    date_reception: get('dateReception')?.value || null,
    date_expiration: get('dateExpiration')?.value || null,
    region_id: get('region_id')?.value ? Number(get('region_id').value) : null,
    departement_id: get('departement_id')?.value ? Number(get('departement_id').value) : null,
    arrondissement_id: get('arrondissement_id')?.value ? Number(get('arrondissement_id').value) : null,
    localite: (get('localite')?.value || '').trim(),
    caisse_id: 1 // valeur par défaut ; override si champ présent
  };

  // Calculs d'affichage / envoi
  const computed = computeLotValues({
    quantite: data.quantite,
    prix_ref: data.prix_ref,
    qualite: data.qualite,
    categorie: data.categorie
  });

  return { ...data, ...computed };
}

/* ---------- Validation minimale côté client ---------- */
function validateLotPayload(payload) {
  const errors = [];
  if (!payload.nom_producteur && !payload.producteur_id) errors.push('nom_producteur requis');
  if (!payload.tel_producteur && !payload.producteur_id) errors.push('tel_producteur requis');
  if (!payload.categorie) errors.push('categorie requis');
  if (!(payload.quantite > 0)) errors.push('quantite doit être > 0');
  if (!(payload.prix_ref >= 0)) errors.push('prix_ref invalide');
  // formats optionnels : date, telephone (simple)
  return errors;
}

/* ---------- Envoi et gestion UI ---------- */
async function createLotFromForm(formSelector, options = {}) {
  const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
  if (!form) throw new Error('Formulaire introuvable');

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : null;

  try {
    // Construire payload
    const payload = buildLotDataFromForm(form);

    // Validation client
    const errors = validateLotPayload(payload);
    if (errors.length) {
      showAlert?.(errors.join(' • '), 'error');
      return { success: false, errors };
    }

    // Indicateur UI
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Envoi...';
    }

    // Appel API (endpoint configurable)
    const endpoint = options.endpoint || '/api/lots';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await resp.json().catch(() => null);

    if (resp.ok) {
      showAlert?.('Lot créé avec succès.', 'success');
      form.reset();
      if (options.onSuccess) options.onSuccess(result);
      return { success: true, result };
    } else {
      const msg = result?.message || result?.error || `Erreur ${resp.status}`;
      showAlert?.(msg, 'error');
      return { success: false, error: msg };
    }
  } catch (err) {
    console.error('createLotFromForm error', err);
    showAlert?.('Erreur réseau ou serveur.', 'error');
    return { success: false, error: err.message };
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

/* ---------- Hook d'initialisation pour ton formulaire ---------- */
function initLotForm(formSelector = '#lotForm', options = {}) {
  const form = document.querySelector(formSelector);
  if (!form) return;

  // Recompute live values si tu as des éléments d'affichage
  const qteEl = form.querySelector('#quantiteLot') || form.querySelector('#qte');
  const prixEl = form.querySelector('#prixRef');
  const qualEl = form.querySelector('#qualite');
  const catEl = form.querySelector('#categorie');

  function recomputeAndRender() {
    const data = {
      quantite: toNumber(qteEl?.value, 0),
      prix_ref: toNumber(prixEl?.value, 0),
      qualite: qualEl?.value,
      categorie: catEl?.value
    };
    const c = computeLotValues(data);
    // Si tu as des éléments d'affichage, mets à jour ici (IDs : valBrute, valEstimee, coefQualite, tauxTax, montantAttribue)
    const valBruteEl = form.querySelector('#valBrute');
    const coefQualiteEl = form.querySelector('#coefQualite');
    const valEstimeeEl = form.querySelector('#valEstimee');
    const tauxTaxEl = form.querySelector('#tauxTax');
    const montantAttribueEl = form.querySelector('#montantAttribue');

    if (valBruteEl) valBruteEl.textContent = (c.valeur_totale || 0).toLocaleString('fr-FR');
    if (coefQualiteEl) coefQualiteEl.textContent = (c.coef_qualite ?? 1).toFixed(2);
    if (valEstimeeEl) valEstimeeEl.textContent = (Math.round((c.valeur_totale || 0) * (c.coef_qualite || 1))).toLocaleString('fr-FR');
    if (tauxTaxEl) tauxTaxEl.textContent = Math.round((c.taux_tax || 0) * 100) + '%';
    if (montantAttribueEl) montantAttribueEl.textContent = (c.benefice_estime || 0).toLocaleString('fr-FR');
  }

  [qteEl, prixEl, qualEl, catEl].forEach(el => { if (el) el.addEventListener('input', recomputeAndRender); });

  // Submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createLotFromForm(form, options);
    if (options.afterSubmit) options.afterSubmit();
  });

  // initial render
  recomputeAndRender();
}

/* ---------- Export global pour usage simple ---------- */
window.LotUtils = {
  computeLotValues,
  buildLotDataFromForm,
  createLotFromForm,
  initLotForm
};
