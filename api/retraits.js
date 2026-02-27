// api/retraits.js  →  /api/retraits et /api/retraits?id=X
const pool = require('./_lib/db');
const { withCors } = require('./_lib/cors');

module.exports = withCors(async (req, res) => {
  const { id } = req.query;

  // GET /api/retraits
  if (req.method === 'GET' && !id) {
    try {
      const result = await pool.query(
        `SELECT r.*, l.description AS lot_description, p.nom_producteur
         FROM retraits r
         LEFT JOIN lots l ON r.lot_id = l.id
         LEFT JOIN producteurs p ON r.destination_producteur_id = p.id
         ORDER BY r.id DESC`
      );
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
    const {
      lot_id, utilisateur, type_retrait, quantite, unite, prix_ref, valeur_totale,
      destination_producteur_id, montant_du, mode_paiement, points_utilises, statut_paiement,
      destination_client, destination_magasin_id, motif, magasin_id, coef_qualite, taux_tax,
      region_id, departement_id, arrondissement_id, localite, admission_id
    } = req.body;

    if (!lot_id || !magasin_id || !quantite || !unite || !type_retrait) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (lot_id, magasin_id, quantite, unite, type_retrait)' });
    }
    if (type_retrait === 'producteur' && !destination_producteur_id) {
      return res.status(400).json({ error: 'destination_producteur_id requis pour type_retrait=producteur' });
    }
    if (type_retrait === 'magasin' && !destination_magasin_id) {
      return res.status(400).json({ error: 'destination_magasin_id requis pour type_retrait=magasin' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Prix ref fallback depuis lots
      let prixRefFinal = prix_ref;
      if (!prixRefFinal) {
        const lotRes = await client.query('SELECT prix_ref FROM lots WHERE id=$1', [lot_id]);
        if (lotRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Lot introuvable' });
        }
        prixRefFinal = lotRes.rows[0].prix_ref || 0;
      }

      const result = await client.query(
        `INSERT INTO retraits (
          lot_id, utilisateur, type_retrait, quantite, unite, prix_ref, valeur_totale,
          destination_producteur_id, montant_du, mode_paiement, points_utilises, statut_paiement,
          destination_client, destination_magasin_id, motif, magasin_id, coef_qualite, taux_tax,
          region_id, departement_id, arrondissement_id, localite, admission_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
        ) RETURNING *`,
        [
          lot_id, utilisateur || 'system', type_retrait, quantite, unite,
          prixRefFinal, valeur_totale || null,
          destination_producteur_id || null, montant_du || null, mode_paiement || null,
          points_utilises || null, statut_paiement || null, destination_client || null,
          destination_magasin_id || null, motif || null, magasin_id, coef_qualite || null,
          taux_tax || null, region_id || null, departement_id || null,
          arrondissement_id || null, localite || null, admission_id || null
        ]
      );

      await client.query('COMMIT');
      return res.status(201).json(result.rows[0]);

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
    try {
      const result = await pool.query('DELETE FROM retraits WHERE id=$1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Retrait introuvable' });
      return res.json({ message: 'Retrait supprimé', retrait: result.rows[0] });
    } catch (err) {
      return res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  }

  res.status(405).end();
});
