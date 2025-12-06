// services/lotsService.js
const pool = require('../db'); // adapte le chemin

/**
 * Appelle la fonction stockée admit_lot_to_caisse_recalc
 * @param {number} lotId
 * @param {number} caisseId
 * @param {string} actor
 * @returns {Promise<{success:boolean, message:string, caisse_ligne_id:number}>}
 */
async function admitLotStored(lotId, caisseId = 1, actor = 'system') {
  const client = await pool.connect();
  try {
    const q = 'SELECT * FROM admit_lot_to_caisse_recalc($1::int, $2::int, $3::text)';
    const { rows } = await client.query(q, [lotId, caisseId, actor]);
    return rows[0] || { success: false, message: 'Aucune réponse de la fonction' };
  } finally {
    client.release();
  }
}

module.exports = { admitLotStored };
