// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';

export default function Dashboard() {
  const { user, magasinId } = useAuth();
  const { stocks, loading: stocksLoading } = useStocks(magasinId);
  const [isLoading, setIsLoading] = useState(true);

  // 🔒 CONSERVATION DES DONNÉES : Structure d'état originale préservée
  const [stats, setStats] = useState({
    totalAdmissions: 0,
    totalRetraits: 0,
    totalTransferts: 0,
    valeurStock: 0,
    admissionsRecentes: [],
    retraitsRecents: [],
    alertesStock: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, [magasinId, stocks]); // Ajout de 'stocks' comme dépendance pour recalculer la valeur si le stock change

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [admissions, retraits] = await Promise.all([
        api.getAdmissions(),
        api.getRetraits(),
      ]);

      // Filtrage sécurisé selon le magasin
      const admissionsFiltered = magasinId 
        ? admissions.filter(a => a.magasin_id === magasinId)
        : admissions;

      const retraitsFiltered = magasinId
        ? retraits.filter(r => r.magasin_id === magasinId)
        : retraits;

      const transferts = retraitsFiltered.filter(r => r.type_retrait === 'magasin');

      // Calcul précis de la valeur du stock
      const valeurStock = stocks?.reduce((sum, s) => sum + (s.stock_actuel * s.prix_ref), 0) || 0;

      // Mise à jour de l'état sans écraser les données non calculées ici
      setStats({
        totalAdmissions: admissionsFiltered.length,
        totalRetraits: retraitsFiltered.length,
        totalTransferts: transferts.length,
        valeurStock,
        admissionsRecentes: admissionsFiltered.slice(0, 5), // Les 5 dernières
        retraitsRecents: retraitsFiltered.slice(0, 5),
        alertesStock: stocks?.filter(s => s.stock_actuel < 10) || [], // Exemple de règle d'alerte
      });
    } catch (error) {
      console.error("Erreur lors du chargement des données du dashboard", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || stocksLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 1. HEADER (Profil & Salutation) */}
      <header className="bg-white px-6 pt-12 pb-6 shadow-sm rounded-b-3xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Bonjour,</p>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {user?.username || 'Utilisateur'}
            </h1>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg shadow-inner">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6">
        
        {/* 2. CARTE HÉROS : Valeur du Stock (Design Premium) */}
        <section className="bg-gradient-to-br from-green-600 to-green-800 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
          {/* Cercle décoratif */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
          
          <p className="text-green-100 text-sm font-medium mb-1">Valeur Totale du Stock</p>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">
            {stats.valeurStock.toLocaleString('fr-FR')} <span className="text-2xl font-medium text-green-200">FCFA</span>
          </h2>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-green-500/30">
            <div className="text-center">
              <p className="text-green-200 text-xs uppercase tracking-wider mb-1">Admissions</p>
              <p className="font-bold text-lg">{stats.totalAdmissions}</p>
            </div>
            <div className="text-center border-x border-green-500/30">
              <p className="text-green-200 text-xs uppercase tracking-wider mb-1">Retraits</p>
              <p className="font-bold text-lg">{stats.totalRetraits}</p>
            </div>
            <div className="text-center">
              <p className="text-green-200 text-xs uppercase tracking-wider mb-1">Transferts</p>
              <p className="font-bold text-lg">{stats.totalTransferts}</p>
            </div>
          </div>
        </section>

        {/* 3. ACTIONS RAPIDES (Ergonomie tactile) */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-4 px-2">⚡ Actions Rapides</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all border border-gray-100 group">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-2xl mb-3 group-hover:bg-blue-100 transition-colors">
                📥
              </div>
              <span className="text-sm font-semibold text-gray-700">Admission</span>
            </button>
            
            <button className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all border border-gray-100 group">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-2xl mb-3 group-hover:bg-orange-100 transition-colors">
                📤
              </div>
              <span className="text-sm font-semibold text-gray-700">Retrait</span>
            </button>
            
            <button className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all border border-gray-100 group">
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-2xl mb-3 group-hover:bg-purple-100 transition-colors">
                🔄
              </div>
              <span className="text-sm font-semibold text-gray-700">Transfert</span>
            </button>
            
            <button className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all border border-gray-100 group">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl mb-3 group-hover:bg-red-100 transition-colors">
                ⚠️
              </div>
              <span className="text-sm font-semibold text-gray-700">Audit / Alerte</span>
              {stats.alertesStock.length > 0 && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {stats.alertesStock.length}
                </span>
              )}
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
