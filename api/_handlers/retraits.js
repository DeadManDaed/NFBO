// api/retraits.js  →  /api/retraits et /api/retraits?id=X
const pool = require('../_lib/db');
const { withCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');

module.exports = withCors(requireAuth(async (req, res) => {
  const { id } = req.query;

  // GET /api/retraits
  if (req.method === 'GET' && !id) {
    try {
      const { magasin_id } = req.query;
      let query = `
        SELECT r.*, l.description AS lot_description, p.nom_producteur
        FROM retraits r
        LEFT JOIN lots l ON r.lot_id = l.id
        LEFT JOIN producteurs p ON r.destination_producteur_id = p.id
      `;
      const params = [];
      if (magasin_id && parseInt(magasin_id) !== 21) {
        query += ' WHERE r.magasin_id = $1';
        params.push(magasin_id);
      }
      query += ' ORDER BY r.id DESC';
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // GET /api/retraits?id=X
  if (req.method === 'GET' && id) {
    try {
      const result = await pool.query(
        `SELECT r.*, l.description AS lot_description, p.nom_producteur
         FROM retraits r
         LEFT JOIN lots l ON r.lot_id = l.id
         LEFT JOIN producteurs p ON r.destination_producteur_id = p.id
         WHERE r.id=$1`,
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // POST /api/retraits
  if (req.method === 'POST') {
  if (!['superadmin', 'admin', 'stock'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const {
    lot_id, type_retrait, quantite, unite, prix_ref,
    destination_producteur_id, mode_paiement, motif,
    magasin_id, region_id, departement_id, arrondissement_id,
    localite, admission_id, observations, destination_client,
    destination_magasin_id, coef_qualite, taux_tax,
    montant_du, points_utilises, statut_paiement,
  } = req.body;

  if (!lot_id || !magasin_id || !quantite || !unite || !type_retrait) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Prix ref fallback ──────────────────────────────────────────────────
    let prixFinal = parseFloat(prix_ref);
    if (!prixFinal) {
      const lotRes = await client.query('SELECT prix_ref FROM lots WHERE id=$1', [lot_id]);
      if (!lotRes.rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Lot introuvable' }); }
      prixFinal = parseFloat(lotRes.rows[0].prix_ref) || 0;
    }

    const valeurTotale = parseFloat(quantite) * prixFinal;

    // ── INSERT retrait ─────────────────────────────────────────────────────

// ── Vérification solde producteur si vente ────────────────────────────────
if (type_retrait === 'producteur' && destination_producteur_id) {
  const prodRes = await client.query(
    'SELECT solde, nom_producteur FROM producteurs WHERE id = $1',
    [destination_producteur_id]
  );
  if (!prodRes.rows[0]) {
    await client.query('ROLLBACK');
    return res.status(404).json({ error: 'Producteur introuvable' });
  }
  const soldeProd = parseFloat(prodRes.rows[0].solde) || 0;
  if (soldeProd < valeurTotale) {
    await client.query('ROLLBACK');
    return res.status(400).json({
      error: `Solde insuffisant`,
      details: `Solde disponible : ${soldeProd.toLocaleString('fr-FR')} FCFA — Montant requis : ${valeurTotale.toLocaleString('fr-FR')} FCFA`,
      solde_disponible: soldeProd,
      montant_requis: valeurTotale,
    });
  }
}
    const result = await client.query(
      `INSERT INTO retraits (
        lot_id, utilisateur, type_retrait, quantite, unite, prix_ref, valeur_totale,
        destination_producteur_id, montant_du, mode_paiement, points_utilises,
        statut_paiement, destination_client, destination_magasin_id, motif,
        magasin_id, coef_qualite, taux_tax, region_id, departement_id,
        arrondissement_id, localite, admission_id, observations
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      ) RETURNING *`,
      [
        lot_id, req.user.username, type_retrait, quantite, unite,
        prixFinal, valeurTotale,
        destination_producteur_id || null, montant_du || null,
        mode_paiement || null, points_utilises || null,
        statut_paiement || null, destination_client || null,
        destination_magasin_id || null, motif || null,
        magasin_id, coef_qualite || null, taux_tax || null,
        region_id || null, departement_id || null,
        arrondissement_id || null, localite || null,
        admission_id || null, observations || null,
      ]
    );
    const retrait = result.rows[0];

    // ── Crédit caisse si vente ─────────────────────────────────────────────
    if (type_retrait === 'vente') {
      const caisseRes = await client.query(
        'SELECT id, solde FROM caisse WHERE magasin_id = $1', [magasin_id]
      );
      if (caisseRes.rows[0]) {
        const caisse      = caisseRes.rows[0];
        const nouveauSolde = parseFloat(caisse.solde) + valeurTotale;
        await client.query('UPDATE caisse SET solde = $1 WHERE id = $2', [nouveauSolde, caisse.id]);
        await client.query(
          `INSERT INTO operations_caisse
             (caisse_id, type_operation, montant, solde_apres, utilisateur, description, lot_id, date_operation)
           VALUES ($1, 'vente', $2, $3, $4, $5, $6, NOW())`,
          [caisse.id, valeurTotale, nouveauSolde,
           req.user.username, `Vente — ${quantite} ${unite}`, lot_id]
        );
      }
    }

    // ── Débit solde producteur si retour producteur ────────────────────────
    if (type_retrait === 'producteur' && destination_producteur_id) {
      const prodRes = await client.query(
        'SELECT solde FROM producteurs WHERE id = $1', [destination_producteur_id]
      );
      if (prodRes.rows[0]) {
        const nouveauSolde = parseFloat(prodRes.rows[0].solde) - valeurTotale;
        await client.query(
          'UPDATE producteurs SET solde = $1 WHERE id = $2',
          [Math.max(0, nouveauSolde), destination_producteur_id]
        );
      }
    }

    // ── Points fidélité si vente ───────────────────────────────────────────
    if (type_retrait === 'vente' && destination_producteur_id) {
      const lotRes = await client.query(
        'SELECT categorie FROM lots WHERE id = $1', [lot_id]
      );
      if (lotRes.rows[0]) {
        const categorie = lotRes.rows[0].categorie;
        const regleRes  = await client.query(
          'SELECT points_par_tranche, montant_tranche FROM regles_points WHERE categorie = $1',
          [categorie]
        );
        if (regleRes.rows[0]) {
          const { points_par_tranche, montant_tranche } = regleRes.rows[0];
          const points = Math.floor(valeurTotale / montant_tranche) * points_par_tranche;
          if (points > 0) {
            await client.query(
              'UPDATE producteurs SET points_fidelite = points_fidelite + $1 WHERE id = $2',
              [points, destination_producteur_id]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    return res.status(201).json(retrait);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur POST retraits:', err.message);
    if (err.code === 'P0001' || /stock insuffisant/i.test(err.message || '')) {
      return res.status(400).json({ error: err.message || 'Stock insuffisant' });
    }
    return res.status(400).json({ error: 'Erreur lors de la création du retrait', details: err.message });
  } finally {
    client.release();
  }
}

  // DELETE /api/retraits?id=X
  if (req.method === 'DELETE' && id) {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Suppression réservée au superadmin' });
    }
    try {
      const result = await pool.query('DELETE FROM retraits WHERE id=$1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
      return res.json({ message: 'Retrait supprimé', retrait: result.rows[0] });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  }

  res.status(405).end();
}));
