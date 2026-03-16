// src/hooks/useLots.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useLots() {
  const queryClient = useQueryClient();

  // Récupération des lots avec React Query
  const {
    data: lots = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lots'],
    queryFn: () => api.getLots(),
  });

  // Mutation pour créer un lot
  const createLotMutation = useMutation({
    mutationFn: (lotData) => api.createLot(lotData),
    onSuccess: () => {
      // Invalider le cache pour forcer un rechargement
      queryClient.invalidateQueries(['lots']);
    },
  });

  // Mutation pour supprimer un lot
  const deleteLotMutation = useMutation({
    mutationFn: (id) => api.deleteLot(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lots']);
    },
  });

  // Fonctions exposées (compatibles avec l'ancien hook)
  const createLot = async (lotData) => {
    return createLotMutation.mutateAsync(lotData);
  };

  const deleteLot = async (id) => {
    return deleteLotMutation.mutateAsync(id);
  };

  return {
    lots,
    loading: isLoading,
    error: error?.message || null,
    fetchLots: refetch,      // permet de recharger manuellement si besoin
    createLot,
    deleteLot,
  };
}
