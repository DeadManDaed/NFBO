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

  const MAGASIN_VIRTUEL = 21;
const isGlobal = !magasinId || magasinId === MAGASIN_VIRTUEL;

const load = useCallback(async () => {
  setLoading(true);
  try {
    const s = stocksRef.current || [];

    if (isGlobal) {
      // Superadmin / auditeur : données cumulées depuis les vues
      const [admissions, retraits, performance] = await Promise.all([
        api.getAdmissions(null).catch(() => []),
        api.getRetraits(null).catch(() => []),
        api.getAuditPerformance().catch(() => []),
      ]);

      const perf = performance.filter(p => p.magasin_id !== MAGASIN_VIRTUEL);
      const valeurStock = perf.reduce((acc, p) => acc + parseFloat(p.valeur_totale_admise || 0), 0);
      const totalAdmissions = perf.reduce((acc, p) => acc + parseInt(p.nombre_admissions || 0), 0);
      const alertes = s.filter(x => (parseFloat(x.stock_actuel) || 0) < 10);

      setData({
        totalAdmissions,
        totalRetraits:    retraits.length,
        totalTransferts:  retraits.filter(r => r.type_retrait === 'magasin').length,
        valeurStock,
        admissionsRecentes: admissions.slice(0, 8),
        retraitsRecents:    retraits.slice(0, 8),
        alertes,
        topStocks: perf.slice(0, 8),
        performance: perf,
      });

    } else {
      // Gestionnaire de magasin : données filtrées
      const [admissions, retraits] = await Promise.all([
        api.getAdmissions(magasinId).catch(() => []),
        api.getRetraits(magasinId).catch(() => []),
      ]);

      const valeurStock = s.reduce((acc, x) => acc + (parseFloat(x.stock_actuel) || 0) * (parseFloat(x.prix_ref) || 0), 0);
      const alertes = s.filter(x => (parseFloat(x.stock_actuel) || 0) < 10);

      setData({
        totalAdmissions:  admissions.length,
        totalRetraits:    retraits.length,
        totalTransferts:  retraits.filter(r => r.type_retrait === 'magasin').length,
        valeurStock,
        admissionsRecentes: admissions.slice(0, 8),
        retraitsRecents:    retraits.slice(0, 8),
        alertes,
        topStocks: [...s].sort((a, b) =>
          (parseFloat(b.stock_actuel) || 0) * (parseFloat(b.prix_ref) || 0) -
          (parseFloat(a.stock_actuel) || 0) * (parseFloat(a.prix_ref) || 0)
        ).slice(0, 8),
        performance: [],
      });
    }

  } catch (e) {
    console.error("Erreur lors du chargement du Dashboard:", e);
  } finally {
    setLoading(false);
  }
}, [magasinId, isGlobal]);

  // Chargement initial
  useEffect(() => { 
  load(); 
}, [load]);

useEffect(() => {
  if (stocks && stocks.length > 0) load();
}, [stocks]);

  return { data, loading, reload: load };
}
