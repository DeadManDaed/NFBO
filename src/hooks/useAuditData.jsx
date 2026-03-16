// src/hooks/useAuditData.jsx

import { useMemo, useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useAlert } from './useAlert';
import api from '../services/api';

export function useAuditData() {
  const queryClient = useQueryClient();
  const { alert, showAlert, hideAlert } = useAlert();

  // ─── Requêtes principales ─────────────────────────────────────────────────
  const results = useQueries({
    queries: [
      {
        queryKey: ['audit', 'pending'],
        queryFn: async () => {
          console.log('[useAuditData] Chargement transferts en attente...');
          const data = await api.getAuditPending();
          console.log('[useAuditData] transfertsPending:', data);
          return data;
        },
        initialData: [],
      },
      {
        queryKey: ['audit', 'validated'],
        queryFn: async () => {
          console.log('[useAuditData] Chargement transferts validés...');
          const data = await api.request('/audit?action=validated-transfers');
          console.log('[useAuditData] transfertsValidated:', data);
          return data;
        },
        initialData: [],
      },
      {
        queryKey: ['audit', 'performance'],
        queryFn: async () => {
          console.log('[useAuditData] Chargement performance...');
          const data = await api.getAuditPerformance();
          console.log('[useAuditData] performanceData:', data);
          return data;
        },
        initialData: [],
      },
      {
        queryKey: ['admissions'],
        queryFn: async () => {
          console.log('[useAuditData] Chargement admissions...');
          const data = await api.getAdmissions(null);
          console.log('[useAuditData] admissions:', data);
          return data;
        },
        initialData: [],
      },
      {
        queryKey: ['retraits'],
        queryFn: async () => {
          console.log('[useAuditData] Chargement retraits...');
          const data = await api.getRetraits(null);
          console.log('[useAuditData] retraits:', data);
          return data;
        },
        initialData: [],
      },
      {
        queryKey: ['lots-stock'],
        queryFn: async () => {
          console.log('[useAuditData] Chargement stocks...');
          const data = await api.request('/lots/stock');
          console.log('[useAuditData] stocks:', data);
          return data;
        },
        initialData: [],
      },
    ],
  });

  const [
    pendingQuery,
    validatedQuery,
    performanceQuery,
    admissionsQuery,
    retraitsQuery,
    stocksQuery,
  ] = results;

  // ─── Données ───────────────────────────────────────────────────────────────
  const transfertsPending   = pendingQuery.data;
  const transfertsValidated = validatedQuery.data;
  const performanceData     = performanceQuery.data;
  const admissions          = admissionsQuery.data;
  const retraits            = retraitsQuery.data;
  const stocks              = stocksQuery.data;

  // ─── État de chargement global ────────────────────────────────────────────
  const loading = results.some(q => q.isLoading);
  const errors = results.filter(q => q.error).map(q => q.error);

  // Afficher les erreurs dans la console
  if (errors.length > 0) {
    console.error('[useAuditData] Erreurs de requête:', errors);
  }

  // ─── Gestion des logs d'un magasin (requête dépendante) ────────────────────
  const [selectedMagasin, setSelectedMagasin] = useState(null);

  const logsQuery = useQuery({
    queryKey: ['audit', 'logs', selectedMagasin?.magasin_id],
    queryFn: async () => {
      console.log('[useAuditData] Chargement logs pour magasin', selectedMagasin?.magasin_id);
      const data = await api.getAuditLogsByStore(selectedMagasin.magasin_id);
      console.log('[useAuditData] magasinLogs:', data);
      return data;
    },
    enabled: !!selectedMagasin,
    initialData: [],
  });

  const magasinLogs = logsQuery.data;
  const loadingLogs = logsQuery.isLoading;

  // ─── Fonctions d'action ───────────────────────────────────────────────────
  const loadAll = () => {
    queryClient.invalidateQueries({ queryKey: ['audit'] });
    queryClient.invalidateQueries({ queryKey: ['admissions'] });
    queryClient.invalidateQueries({ queryKey: ['retraits'] });
    queryClient.invalidateQueries({ queryKey: ['lots-stock'] });
  };

  const loadMagasinLogs = async (magasin) => {
    setSelectedMagasin(magasin);
  };

  const clearMagasin = () => {
    setSelectedMagasin(null);
    queryClient.removeQueries({ queryKey: ['audit', 'logs'] });
  };

  // ─── Statistiques calculées ────────────────────────────────────────────────
  const total = transfertsPending.length + transfertsValidated.length;
  const tauxValid = total > 0 ? Math.round((transfertsValidated.length / total) * 100) : 0;

  return {
    transfertsPending,
    transfertsValidated,
    performanceData,
    admissions,
    retraits,
    stocks,
    magasinLogs,
    selectedMagasin,
    loading,
    loadingLogs,
    tauxValid,
    loadAll,
    loadMagasinLogs,
    clearMagasin,
    alert,
    hideAlert,
  };
}