/* Chemin d'accès : src/hooks/useDashboardData.js */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export function useDashboardData(magasinId, stocks) {
  // État initial "propre" pour éviter les erreurs de lecture
  const [data, setData] = useState({
    totalAdmissions: null,
    totalRetraits: null,
    totalTransferts: null,
    valeurStock: null,
    admissionsRecentes: [],
    retraitsRecents: [],
    alertes: [],
    topStocks: [],
  });
  
  const [loading, setLoading] = useState(true);
  const stocksRef = useRef(stocks);

  // Mise à jour de la ref quand les stocks changent
  useEffect(() => { 
    stocksRef.current = stocks; 
  }, [stocks]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [admissions, retraits] = await Promise.all([
        api.getAdmissions(magasinId || null).catch(() => []),
        api.getRetraits().catch(() => []),
      ]);

      const adm = admissions;
const ret = retraits
      const s = stocksRef.current || [];
      
      const valeurStock = s.reduce((acc, x) => acc + (parseFloat(x.stock_actuel)||0) * (parseFloat(x.prix_ref)||0), 0);
const alertes = s.filter(x => (parseFloat(x.stock_actuel)||0) < 10);

      setData({
        totalAdmissions: adm.length,
        totalRetraits: ret.length,
        totalTransferts: ret.filter(r => r.type_retrait === 'magasin').length,
        valeurStock,
        admissionsRecentes: adm.slice(0, 8),
        retraitsRecents: ret.slice(0, 8),
        alertes,
        // CORRECTION : On trie une copie pour éviter de muter les props
        topStocks: [...s].sort((a, b) => 
  (parseFloat(b.stock_actuel)||0) * (parseFloat(b.prix_ref)||0) - 
  (parseFloat(a.stock_actuel)||0) * (parseFloat(a.prix_ref)||0)
).slice(0, 8),
      });
    } catch (e) {
      console.error("Erreur lors du chargement du Dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, [magasinId]);

  // Chargement initial
  useEffect(() => { 
  load(); 
}, [load]);

useEffect(() => {
  if (stocks && stocks.length > 0) load();
}, [stocks]);

  return { data, loading, reload: load };
}
