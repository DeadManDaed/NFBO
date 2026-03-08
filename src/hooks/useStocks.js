//src/hooks/useStocks.js

import { useState, useEffect } from 'react';
import api from '../services/api';

export function useStocks(magasinId = null) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const MAGASIN_VIRTUEL = 21;
const data = (!magasinId || magasinId === MAGASIN_VIRTUEL)
  ? await api.request('/stocks')
  : await api.getStockDisponible(magasinId);
      setStocks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('❌ Erreur chargement stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchStocks();
}, [magasinId]);

  return { 
    stocks, 
    loading, 
    error, 
    refresh: fetchStocks 
  };
}