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
      const data = magasinId 
        ? await api.getStockDisponible(magasinId)
        : await api.getStocks();
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
    if (magasinId) {
      fetchStocks();
    }
  }, [magasinId]);

  return { 
    stocks, 
    loading, 
    error, 
    refresh: fetchStocks 
  };
}