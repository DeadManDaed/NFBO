//src/hooks/useLots.js

import { useState, useEffect } from 'react';
import api from '../services/api';

export function useLots() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const data = await api.getLots();
      setLots(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const createLot = async (lotData) => {
    try {
      const newLot = await api.createLot(lotData);
      setLots([newLot, ...lots]);
      return newLot;
    } catch (err) {
      throw err;
    }
  };

  const deleteLot = async (id) => {
    try {
      await api.deleteLot(id);
      setLots(lots.filter(lot => lot.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { lots, loading, error, fetchLots, createLot, deleteLot };
}