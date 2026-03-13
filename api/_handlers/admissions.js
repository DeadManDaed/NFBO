// api/admissions.js  →  /api/admissions et /api/admissions?id=X
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');
const pool = require('../_lib/db');

module.exports = withCors(requireAuth(async (req, res) => {
  const { id } = req.query;

  // GET /api/admissions

if (req.method === 'GET') {
  try {
    const { magasin_id, limit = 100 } = req.query;
    let query = `
      SELECT a.*, l.description AS lot_description, l.unites_admises AS unite, p.nom_producteur, m.nom AS magasin_nom
      FROM admissions a
      LEFT JOIN lots l ON l.id = a.lot_id
      LEFT JOIN producteurs p ON p.id = a.producteur_id
      LEFT JOIN magasins m ON m.id = a.magasin_id
    `;
    const params = [];
    if (magasin_id && parseInt(magasin_id) !== 21) {
      query += ' WHERE a.magasin_id = $1';
      params.push(magasin_id);
    }
    query += ' ORDER BY a.date_reception DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
  // api/_handlers/admissions.js — remplacer le bloc POST /api/admissions

if (req.method === 'POST') {
  if (!['superadmin', 'admin', 'stock'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const {
    lot_id, producteur_id, quantite, unite, prix_ref,
    coef_qualite, date_expiration, magasin_id, mode_paiement,
    utilisateur, source,
  } = req.body;

  const isAchatDirect = source === 'achat_direct';

  // Validation
  if (!lot_id || !quantite || !unite || !magasin_id) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  if (!isAchatDirect && !producteur_id) {
    return res.status(400).json({ error: 'Producteur requis pour ce type d\'admission' });
  }

  try {
    const date_reception = new Date().toISOString();
    const username = utilisateur || req.user.username;
    const montantTotal = parseFloat(quantite) * parseFloat(prix_ref);

    // Insérer l'admission
    const result = await pool.query(
      `INSERT INTO admissions (
        lot_id, producteur_id, quantite, unite, prix_ref,
        coef_qualite, date_reception, date_expiration,
        magasin_id, mode_paiement, utilisateur, source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        parseInt(lot_id),
        isAchatDirect ? null : parseInt(producteur_id),
        parseFloat(quantite),
        unite,
        parseFloat(prix_ref),
        parseFloat(coef_qualite || 1),
        date_reception,
        date_expiration || null,
        parseInt(magasin_id),
        isAchatDirect ? 'especes' : (mode_paiement || null),
        username,
        isAchatDirect ? 'achat_direct' : 'producteur',
      ]
    );

    // Débit caisse magasin 1 si achat direct
    if (isAchatDirect) {
      // Récupérer la caisse du magasin 1
      const caisseRes = await pool.query(
        `SELECT id, solde FROM caisse WHERE magasin_id = 1 LIMIT 1`
      );

      if (caisseRes.rows.length > 0) {
        const caisse = caisseRes.rows[0];
        const nouveauSolde = parseFloat(caisse.solde) - montantTotal;

        // Mettre à jour le solde
        await pool.query(
          `UPDATE caisse SET solde = $1 WHERE id = $2`,
          [nouveauSolde, caisse.id]
        );

        // Enregistrer l'opération
        await pool.query(
          `INSERT INTO operations_caisse (
            caisse_id, type_operation, montant, solde_apres,
            description, utilisateur, lot_id, date_operation
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [
            caisse.id,
            'achat_direct',
            -montantTotal,
            nouveauSolde,
            `Achat direct — ${result.rows[0].id} — lot #${lot_id}`,
            username,
            parseInt(lot_id),
          ]
        );
      }
    }

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Erreur SQL Admission:', err.message);
    return res.status(500).json({ error: 'Erreur SQL', details: err.message });
  }
}

  res.status(405).end();
}));
