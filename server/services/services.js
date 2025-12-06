// services/lotsService.js
const pool = require('../db'); // adapte le chemin selon ton projet

// Constantes métier réutilisables
const QUAL_COEF = { excellente: 1.00, bonne: 0.95, moyenne: 0.90, A: 1.00, B: 0.95, C: 0.90 };
const TAX_BY_CAT = { frais: 0.25, secs: 0.10, manualim: 0.10, nonalim: 0.10, sensible: 0.25, fruits: 0.10, legumes: 0.10 };

// Utilitaire de recalcul côté serveur
function computeLotValues({ quantite, prix_ref, qualite, categorie }) {
  const qte = Number(quantite || 0);
  const prix = Number(prix_ref || 0);
  const qualCoef = QUAL_COEF[qualite] ?? 1.0;
  const tax = TAX_BY_CAT[categorie] ?? 0.10;

  const valeur_totale = Number((qte * prix).toFixed(2));
  const benefice_estime = Number(Math.round((valeur_totale * qualCoef) * (1 - tax)));

  return { valeur_totale, benefice_estime, coef_qualite: qualCoef, taux_tax: tax };
}

// Validation minimale des champs requis
function validatePayload(payload) {
  const errors = [];
  if (!payload.nom_producteur && !payload.producteur_id) errors.push('nom_producteur ou producteur_id requis');
  if (!payload.tel_producteur && !payload.producteur_id) errors.push('tel_producteur ou producteur_id requis');
  if (!payload.categorie) errors.push('categorie requis');
  if (!payload.quantite || Number(payload.quantite) <= 0) errors.push('quantite doit être > 0');
  if (!payload.prix_ref || Number(payload.prix_ref) < 0) errors.push('prix_ref invalide');
  return errors;
}

// Implémentation principale
async function admitLotTransaction(payload) {
  // Normaliser clés attendues en snake_case
  const data = {
    nom_producteur: payload.nom_producteur || payload.nomProducteur || null,
    tel_producteur: payload.tel_producteur || payload.telProducteur || null,
    type_producteur: payload.type_producteur || payload.typeProducteur || null,
    categorie: payload.categorie || payload.categorieLot || null,
    description: payload.description || null,
    quantite: Number(payload.quantite || payload.quantiteLot || 0),
    unite: payload.unite || payload.uniteLot || null,
    prix_ref: Number(payload.prix_ref || payload.prixRef || 0),
    qualite: payload.qualite || null,
    date_reception: payload.date_reception || payload.dateReception || null,
    date_expiration: payload.date_expiration || payload.dateExpiration || null,
    region_id: payload.region_id || payload.regionId || null,
    departement_id: payload.departement_id || payload.departementId || null,
    arrondissement_id: payload.arrondissement_id || payload.arrondissementId || null,
    localite: payload.localite || null,
    producteur_id: payload.producteur_id || payload.producteurId || null,
    caisse_id: payload.caisse_id || payload.caisseId || 1
  };

  // Validation minimale
  const validationErrors = validatePayload(data);
  if (validationErrors.length) {
    return { success: false, errors: validationErrors };
  }

  // Recalcul côté serveur pour sécurité
  const computed = computeLotValues({
    quantite: data.quantite,
    prix_ref: data.prix_ref,
    qualite: data.qualite,
    categorie: data.categorie
  });

  // Fusionner les valeurs recalculées
  data.valeur_totale = computed.valeur_totale;
  data.benefice_estime = computed.benefice_estime;
  data.coef_qualite = computed.coef_qualite;
  data.taux_tax = computed.taux_tax;

  const client = await pool.connect();
  try {
    // Option 1 : si la fonction stockée existe, l'appeler pour déléguer la logique
    // Cela simplifie le code JS et centralise la logique métier en base
    const callStoredFunction = true; // bascule si tu veux forcer l'implémentation JS

    if (callStoredFunction) {
      // Appel de la fonction stockée admit_lot_to_caisse
      const res = await client.query(
        `SELECT * FROM admit_lot_to_caisse($1, $2, $3, $4, $5)`,
        [null, data.producteur_id, data.valeur_totale, data.benefice_estime, data.caisse_id]
      );
      // La fonction retourne success et message en table
      const row = res.rows[0] || {};
      if (row.success) {
        return { success: true, message: row.message || 'Admission via fonction stockée OK' };
      } else {
        return { success: false, message: row.message || 'Erreur fonction stockée' };
      }
    }

    // Option 2 : implémentation JS transactionnelle (fallback)
    await client.query('BEGIN');

    // 1. Trouver ou créer producteur
    let producteurId = data.producteur_id;
    if (!producteurId) {
      const prodRes = await client.query(
        'SELECT id FROM producteurs WHERE tel_producteur = $1 FOR UPDATE',
        [data.tel_producteur]
      );
      if (prodRes.rows.length === 0) {
        const insertProd = await client.query(
          `INSERT INTO producteurs (nom_producteur, tel_producteur, type_producteur, solde)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [data.nom_producteur, data.tel_producteur, data.type_producteur, data.valeur_totale]
        );
        producteurId = insertProd.rows[0].id;
      } else {
        producteurId = prodRes.rows[0].id;
        await client.query(
          'UPDATE producteurs SET solde = COALESCE(solde,0) + $1 WHERE id = $2',
          [data.valeur_totale, producteurId]
        );
      }
    } else {
      // verrouiller le producteur
      await client.query('SELECT id FROM producteurs WHERE id = $1 FOR UPDATE', [producteurId]);
      // crédit immédiat
      await client.query('UPDATE producteurs SET solde = COALESCE(solde,0) + $1 WHERE id = $2', [data.valeur_totale, producteurId]);
    }

    // 2. Insérer le lot
    const insertLotText = `INSERT INTO lots (
      producteur_id, nom_producteur, tel_producteur, type_producteur, categorie, description,
      quantite, unite, prix_ref, qualite, date_reception, date_expiration,
      region_id, departement_id, arrondissement_id, localite,
      statut, valeur_totale, benefice_estime, coef_qualite, taux_tax
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'en_attente',$17,$18,$19,$20
    ) RETURNING id`;
    const insertLotValues = [
      producteurId, data.nom_producteur, data.tel_producteur, data.type_producteur, data.categorie, data.description,
      data.quantite, data.unite, data.prix_ref, data.qualite, data.date_reception, data.date_expiration,
      data.region_id, data.departement_id, data.arrondissement_id, data.localite,
      data.valeur_totale, data.benefice_estime, data.coef_qualite, data.taux_tax
    ];
    const resLot = await client.query(insertLotText, insertLotValues);
    const lotId = resLot.rows[0].id;

    // 3. Insérer ligne en caisse_lignes (virtuel) et mettre à jour caisse
    await client.query(
      `INSERT INTO caisse_lignes (caisse_id, lot_id, producteur_id, type_operation, montant, statut, reference)
       VALUES ($1,$2,$3,'admission_lot',$4,'virtuel',$5)`,
      [data.caisse_id, lotId, producteurId, data.benefice_estime, JSON.stringify({ valeur_totale: data.valeur_totale, benefice_estime: data.benefice_estime })]
    );

    await client.query(
      'UPDATE caisse SET benefices_virtuels = benefices_virtuels + $1 WHERE id = $2',
      [data.benefice_estime, data.caisse_id]
    );

    // 4. Insérer opération d'audit
    await client.query(
      `INSERT INTO operations_caisse (utilisateur, type_operation, montant, solde_apres, producteur, description, date_operation, caisse_id, lot_id, producteur_id)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9)`,
      ['system', 'credit', data.valeur_totale, null, data.nom_producteur, 'Crédit immédiat à l\'admission du lot', data.caisse_id, lotId, producteurId]
    );

    await client.query('COMMIT');
    return { success: true, lotId };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    // Log côté serveur et renvoyer message générique
    console.error('admitLotTransaction error', err);
    return { success: false, error: err.message || 'Erreur interne' };
  } finally {
    client.release();
  }
}

module.exports = { admitLotTransaction, computeLotValues };
