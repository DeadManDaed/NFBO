// src/hooks/useAuditData.jsx

import { useState, useEffect, useCallback } from 'react';
import { useAlert } from './useAlert';
import api from '../services/api';

export function useAuditData() {
  const { alert, showAlert, hideAlert } = useAlert();

  const [transfertsPending,   setTransfertsPending]   = useState([]);
  const [transfertsValidated, setTransfertsValidated] = useState([]);
  const [performanceData,     setPerformanceData]     = useState([]);
  const [admissions,          setAdmissions]          = useState([]);
  const [retraits,            setRetraits]            = useState([]);
  const [stocks,              setStocks]              = useState([]);
  const [magasinLogs,         setMagasinLogs]         = useState([]);
  const [selectedMagasin,     setSelectedMagasin]     = useState(null);
  const [loading,             setLoading]             = useState(false);
  const [loadingLogs,         setLoadingLogs]         = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, validated, perf, adm, ret, stk] = await Promise.all([
        api.getAuditPending().catch(() => []),
        api.request('/audit?action=validated-transfers').catch(() => []),
        api.getAuditPerformance().catch(() => []),
        api.getAdmissions(null).catch(() => []),
        api.getRetraits(null).catch(() => []),
        api.request('/lots/stock').catch(() => []),
      ]);
      setTransfertsPending(pending);
      setTransfertsValidated(validated);
      setPerformanceData(perf);
      setAdmissions(adm);
      setRetraits(ret);
      setStocks(stk);
    } catch (err) {
      showAlert(`❌ Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMagasinLogs = useCallback(async (magasin) => {
    setSelectedMagasin(magasin);
    setMagasinLogs([]);
    setLoadingLogs(true);
    try {
      const logs = await api.getAuditLogsByStore(magasin.magasin_id);
      setMagasinLogs(logs);
    } catch (err) {
      showAlert(`❌ Erreur logs: ${err.message}`, 'error');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const clearMagasin = useCallback(() => {
    setSelectedMagasin(null);
    setMagasinLogs([]);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const total     = transfertsPending.length + transfertsValidated.length;
  const tauxValid = total > 0 ? Math.round((transfertsValidated.length / total) * 100) : 0;

  return {
    // données
    transfertsPending,
    transfertsValidated,
    performanceData,
    admissions,
    retraits,
    stocks,
    magasinLogs,
    selectedMagasin,
    // états
    loading,
    loadingLogs,
    // stats calculées
    tauxValid,
    // actions
    loadAll,
    loadMagasinLogs,
    clearMagasin,
    // alertes
    alert,
    hideAlert,
  };
}