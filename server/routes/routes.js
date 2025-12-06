// routes/lots.js
const express = require('express');
const router = express.Router();
const { admitLotTransaction } = require('../services/lotsService');

router.post('/', async (req, res) => {
  try {
    const result = await admitLotTransaction(req.body);
    if (result.success) {
      res.json({ message: 'Lot admis', ...result });
    } else {
      res.status(400).json({ message: 'Échec admission', details: result.errors || result.message || result.error });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
