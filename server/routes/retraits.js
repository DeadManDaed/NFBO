/**
 * server/routes/retraits.js
 *
 * Routes CRUD pour les retraits (sorties de stock, transferts, retours producteur, destructions).
 * - Valide les champs essentiels
 * - Remplit prix_ref depuis la table lots si absent
 * - Vérifie le stock disponible pour le magasin source (si applicable)
 * - Utilise une transaction pour l'insert afin d'éviter incohérences
 * - Ne contient PAS de top-level await (compatible CommonJS require)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db'); // pool PG (Pool) — doit exporter un pool (pas un client connecté par TLA)

/**
 * Helper : calcule le stock disponible pour un lot dans un magasin
 * (somme admissions - somme retraits)
 */
async function getStockForLotInMagasin(lotId, magasinId) {
  const admRes = await pool.query(
    `SELECT COALESCE(SUM(quantite), 0) AS total_adm
     FROM admissions
     WHERE lot_id = $1 AND magasin_id = $2`,
    [lotId, magasinId]
  );
  const retRes = await pool.query(
    `SELECT COALESCE(SUM(quantite), 0) AS total_ret
     FROM retraits
     WHERE lot_id = $1 AND magasin_id = $2`,
    [lotId, magasinId]
  );
  const totalAdm = parseFloat(admRes.rows[0].total_adm) || 0;
  const totalRet = parseFloat(retRes.rows[0].total_ret) || 0;
  return totalAdm - totalRet;
}

/* GET : liste des retraits (derniers n) */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, l.description AS lot_description, p.nom_producteur
       FROM retraits r
       LEFT JOIN lots l ON r.lot_id = l.id
       LEFT JOIN producteurs p ON r.destination_producteur_id = p.id
       ORDER BY r.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET retraits', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* GET par id */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, l.description AS lot_description, p.nom_producteur
       FROM retraits r
       LEFT JOIN lots l ON r.lot_id = l.id
       LEFT JOIN producteurs p ON r.destination_producteur_id = p.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur GET retrait', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* POST : créer un retrait (sortie/transfert/destruction/retour producteur)
   Attendu dans req.body (au minimum) :
     - lot_id, quantite, unite, type_retrait, magasin_id
   Le champ prix_ref est requis par la table : si absent, on tente de le prendre depuis lots.prix_ref.
*/
router.post('/', async (req, res) => {
  const {
    lot_id,
    utilisateur,
    type_retrait,
    quantite,
    unite,
    prix_ref,
    valeur_totale,
    destination_producteur_id,
    montant_du,
    mode_paiement,
    points_utilises,
    statut_paiement,
    destination_client,
    destination_magasin_id,
    motif,
    magasin_id,
    coef_qualite,
    taux_tax,
    region_id,
    departement_id,
    arrondissement_id,
    localite,
    admission_id
  } = req.body;

  // validations basiques côté serveur
  if (!lot_id || !magasin_id || !quantite || !unite || !type_retrait) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (lot_id, magasin_id, quantite, unite, type_retrait)' });
  }

  // validations conditionnelles
  if (type_retrait === 'producteur' && !destination_producteur_id) {
    return res.status(400).json({ error: 'destination_producteur_id requis pour type_retrait=producteur' });
  }
  if (type_retrait === 'magasin' && !destination_magasin_id) {
    return res.status(400).json({ error: 'destination_magasin_id requis pour type_retrait=magasin' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) prix_ref fallback : si non fourni ou falsy, récupérer depuis lots
    let prixRefFinal = prix_ref;
    if (!prixRefFinal) {
      const lotRes = await client.query('SELECT prix_ref FROM lots WHERE id = $1', [lot_id]);
      if (lotRes.rows.length > 0) {
        prixRefFinal = lotRes.rows[0].prix_ref || 0;
      } else {
        // lot inconnu
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Lot introuvable' });
      }
    }

    // 2) Vérifier stock disponible si le type implique consommation (vente, magasin, producteur)
    // On autorise les destructions même si stock insuffisant? Ici on bloque sauf si type == 'destruction' (configurable)
    const typesQuiConsomment = ['vente', 'producteur', 'magasin'];
    if (typesQuiConsomment.includes(type_retrait)) {
      const available = await getStockForLotInMagasin(lot_id, magasin_id);
      if (available < parseFloat(quantite)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Stock insuffisant', details: { available, requested: parseFloat(quantite) } });
      }
    }

    // 3) Insert du retrait
    const insertQuery = `
      INSERT INTO retraits (
        lot_id, utilisateur, type_retrait, quantite, unite, prix_ref, valeur_totale,
        destination_producteur_id, montant_du, mode_paiement, points_utilises, statut_paiement,
        destination_client, destination_magasin_id, motif, magasin_id, coef_qualite, taux_tax,
        region_id, departement_id, arrondissement_id, localite, admission_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23
      ) RETURNING *`;

    const values = [
      lot_id,
      utilisateur || 'system',
      type_retrait,
      quantite,
      unite,
      prixRefFinal,
      valeur_totale || null,
      destination_producteur_id || null,
      montant_du || null,
      mode_paiement || null,
      points_utilises || null,
      statut_paiement || null,
      destination_client || null,
      destination_magasin_id || null,
      motif || null,
      magasin_id,
      coef_qualite || null,
      taux_tax || null,
      region_id || null,
      departement_id || null,
      arrondissement_id || null,
      localite || null,
      admission_id || null
    ];

    const insertRes = await client.query(insertQuery, values);

    // Commit : triggers PostgreSQL (update_stock_on_retrait, handle_magasin_transfer...) s'exécuteront après l'INSERT
    await client.query('COMMIT');

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur POST retraits', err);
    // retourner le message d'erreur utile mais succinct
    res.status(400).json({ error: 'Erreur lors de la création du retrait', details: err.message });
  } finally {
    client.release();
  }
});

/* DELETE : supprimer un retrait */
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM retraits WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
    res.json({ message: 'Retrait supprimé', retrait: result.rows[0] });
  } catch (err) {
    console.error('Erreur DELETE retraits:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
