// src/hooks/useAuditData.jsx
import { useMemo, useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useAlert } from './useAlert';
import api from '../services/api';

export function useAuditData() {
  const queryClient = useQueryClient();
  const { alert, showAlert, hideAlert } = useAlert();

  // ─── Requêtes principales (toutes lancées en parallèle) ─────────────────────
  const results = useQueries({
    queries: [
      {
        queryKey: ['audit', 'pending'],
        queryFn: () => api.getAuditPending().catch(() => []),
        initialData: [],
      },
      {
        queryKey: ['audit', 'validated'],
        queryFn: () => api.request('/audit?action=validated-transfers').catch(() => []),
        initialData: [],
      },
      {
        queryKey: ['audit', 'performance'],
        queryFn: () => api.getAuditPerformance().catch(() => []),
        initialData: [],
      },
      {
        queryKey: ['admissions'],
        queryFn: () => api.getAdmissions(null).catch(() => []),
        initialData: [],
      },
      {
        queryKey: ['retraits'],
        queryFn: () => api.getRetraits(null).catch(() => []),
        initialData: [],
      },
      {
        queryKey: ['lots-stock'],
        queryFn: () => api.request('/lots/stock').catch(() => []),
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

  // ─── Gestion des logs d'un magasin (requête dépendante) ────────────────────
  const [selectedMagasin, setSelectedMagasin] = useState(null);

  const logsQuery = useQuery({
    queryKey: ['audit', 'logs', selectedMagasin?.magasin_id],
    queryFn: () => api.getAuditLogsByStore(selectedMagasin.magasin_id),
    enabled: !!selectedMagasin,
    initialData: [],
  });

  const magasinLogs = logsQuery.data;
  const loadingLogs = logsQuery.isLoading;

  // ─── Fonctions d'action (pour compatibilité) ───────────────────────────────
  const loadAll = () => {
    // Invalide toutes les requêtes principales pour les recharger
    queryClient.invalidateQueries({ queryKey: ['audit'] });
    queryClient.invalidateQueries({ queryKey: ['admissions'] });
    queryClient.invalidateQueries({ queryKey: ['retraits'] });
    queryClient.invalidateQueries({ queryKey: ['lots-stock'] });
  };

  const loadMagasinLogs = async (magasin) => {
    setSelectedMagasin(magasin);
    // La query s'exécutera automatiquement car enabled devient true
  };

  const clearMagasin = () => {
    setSelectedMagasin(null);
    // Optionnel : on peut aussi invalider pour nettoyer le cache
    queryClient.removeQueries({ queryKey: ['audit', 'logs'] });
  };

  // ─── Statistiques calculées ────────────────────────────────────────────────
  const total = transfertsPending.length + transfertsValidated.length;
  const tauxValid = total > 0 ? Math.round((transfertsValidated.length / total) * 100) : 0;

  // ─── Retour (même interface que l'ancien hook) ─────────────────────────────
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