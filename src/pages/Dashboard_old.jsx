//src/pages/Dashboard.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';

export default function Dashboard() {
  const { user, magasinId } = useAuth();
  const { stocks } = useStocks(magasinId);

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
  }, [magasinId]);

  const loadDashboardData = async () => {
    try {
      const [admissions, retraits] = await Promise.all([
        api.getAdmissions(),
        api.getRetraits(),
      ]);

      // Filtrer par magasin si nécessaire
      const admissionsFiltered = magasinId 
        ? admissions.filter(a => a.magasin_id === magasinId)
        : admissions;

      const retraitsFiltered = magasinId
        ? retraits.filter(r => r.magasin_id === magasinId)
        : retraits;

      const transferts = retraitsFiltered.filter(r => r.type_retrait === 'magasin');

      // Calculer valeur du stock
      const valeurStock = stocks.reduce((sum, s) => sum + (s.stock_actuel * s.prix_ref), 0);

      // Alertes stock faible
      const alertesStock = stocks.filter(s => s.stock_actuel < 10);

      setStats({
        totalAdmissions: admissionsFiltered.length,
        totalRetraits: retraitsFiltered.length,
        totalTransferts: transferts.length,
        valeurStock,
        admissionsRecentes: admissionsFiltered.slice(0, 5),
        retraitsRecents: retraitsFiltered.slice(0, 5),
        alertesStock,
      });
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenue, {user?.nom || user?.username || 'Utilisateur'} 👋
        </h1>
        <p className="text-white/90">
          {user?.role === 'superadmin' ? 'Vue d\'ensemble globale' : 
           `Magasin: ${user?.magasin_nom || 'N/A'}`}
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">📥</div>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              +{stats.admissionsRecentes.length} récentes
            </span>
          </div>
          <p className="text-gray-600 text-sm">Total Admissions</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalAdmissions}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">📤</div>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {stats.retraitsRecents.length} récents
            </span>
          </div>
          <p className="text-gray-600 text-sm">Total Retraits</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalRetraits}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">🔄</div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Inter-magasins
            </span>
          </div>
          <p className="text-gray-600 text-sm">Transferts</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalTransferts}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">💰</div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {stocks.length} lots
            </span>
          </div>
          <p className="text-gray-600 text-sm">Valeur Stock</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">
            {stats.valeurStock.toLocaleString()} <span className="text-lg">FCFA</span>
          </p>
        </div>
      </div>

      {/* Alertes stock faible */}
      {stats.alertesStock.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 mb-2">
                Alertes de stock faible ({stats.alertesStock.length})
              </h3>
              <div className="space-y-1">
                {stats.alertesStock.slice(0, 5).map((stock, idx) => (
                  <p key={idx} className="text-yellow-700 text-sm">
                    • <strong>{stock.description}</strong> : {stock.stock_actuel} {stock.unite}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activités récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admissions récentes */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📥 Admissions récentes
          </h3>
          <div className="space-y-3">
            {stats.admissionsRecentes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune admission récente</p>
            ) : (
              stats.admissionsRecentes.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{a.lot_description || 'N/A'}</p>
                    <p className="text-sm text-gray-600">
                      {a.nom_producteur} • {a.quantite} {a.unite}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {(a.quantite * a.prix_ref).toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(a.date_reception).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Retraits récents */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📤 Retraits récents
          </h3>
          <div className="space-y-3">
            {stats.retraitsRecents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun retrait récent</p>
            ) : (
              stats.retraitsRecents.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{r.lot_description || 'N/A'}</p>
                    <p className="text-sm text-gray-600">
                      {r.quantite} {r.unite}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      r.type_retrait === 'vente' ? 'bg-green-100 text-green-800' :
                      r.type_retrait === 'producteur' ? 'bg-blue-100 text-blue-800' :
                      r.type_retrait === 'magasin' ? 'bg-purple-100 text-purple-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {r.type_retrait}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(r.date_retrait || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top produits en stock */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          📦 Top 10 produits en stock
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Produit</th>
                <th className="p-3 text-left">Catégorie</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {stocks.slice(0, 10).map((stock, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{stock.description}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {stock.categorie}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {stock.stock_actuel} {stock.unite}
                  </td>
                  <td className="p-3 text-right font-semibold text-green-600">
                    {(stock.stock_actuel * stock.prix_ref).toLocaleString()} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          ⚡ Actions rapides
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-lg transition-all group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📥</div>
            <p className="font-medium text-gray-800">Nouvelle admission</p>
          </button>
          <button className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-lg transition-all group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📤</div>
            <p className="font-medium text-gray-800">Nouveau retrait</p>
          </button>
          <button className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-lg transition-all group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔄</div>
            <p className="font-medium text-gray-800">Transfert</p>
          </button>
          <button className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:shadow-lg transition-all group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
            <p className="font-medium text-gray-800">Consulter stock</p>
          </button>
        </div>
      </div>
    </div>
  );
}