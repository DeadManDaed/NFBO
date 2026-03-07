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
        api.getAdmissions().catch(() => []),
        api.getRetraits().catch(() => []),
      ]);

      const adm = magasinId ? admissions.filter(a => a.magasin_id === magasinId) : admissions;
      const ret = magasinId ? retraits.filter(r => r.magasin_id === magasinId) : retraits;
      const s = stocksRef.current || [];
      
      const valeurStock = s.reduce((acc, x) => acc + (x.stock_actuel * x.prix_ref), 0);
      const alertes = s.filter(s => s.stock_actuel < 10);

      setData({
        totalAdmissions: adm.length,
        totalRetraits: ret.length,
        totalTransferts: ret.filter(r => r.type_retrait === 'magasin').length,
        valeurStock,
        admissionsRecentes: adm.slice(0, 8),
        retraitsRecents: ret.slice(0, 8),
        alertes,
        // CORRECTION : On trie une copie pour éviter de muter les props
        topStocks: [...s].sort((a, b) => (b.stock_actuel * b.prix_ref) - (a.stock_actuel * a.prix_ref)).slice(0, 8),
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

  return { data, loading, reload: load };
}
