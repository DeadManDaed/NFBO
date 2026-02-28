//src/pages/Dashboard.jsx

/*

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

*/

// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';

function StatCard({ emoji, label, value, badge, small }) {
  return (
    <div className={`bg-white rounded-2xl shadow p-4 flex items-start gap-3 ${small ? 'text-sm' : ''}`}>
      <div className="text-3xl">{emoji}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">{label}</p>
          {badge && <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">{badge}</span>}
        </div>
        <p className={`font-bold text-gray-800 ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      </div>
    </div>
  );
}

function SmallListItem({ title, subtitle, right }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-800 text-sm">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="text-right text-xs text-gray-500">{right}</div>}
    </div>
  );
}

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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magasinId, stocks.length]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [admissions, retraits] = await Promise.all([
        api.getAdmissions(),
        api.getRetraits(),
      ]);

      const admissionsFiltered = magasinId
        ? (admissions || []).filter(a => a.magasin_id === magasinId)
        : (admissions || []);

      const retraitsFiltered = magasinId
        ? (retraits || []).filter(r => r.magasin_id === magasinId)
        : (retraits || []);

      const transferts = retraitsFiltered.filter(r => r.type_retrait === 'magasin');

      const valeurStock = (stocks || []).reduce((sum, s) => sum + ((s.stock_actuel || 0) * (s.prix_ref || 0)), 0);

      const alertesStock = (stocks || []).filter(s => (s.stock_actuel || 0) < 10);

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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b z-30">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Bienvenue</p>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {user?.nom || user?.username || 'Utilisateur'}
            </h1>
            <p className="text-xs text-gray-500">
              {user?.role === 'superadmin' ? "Vue d'ensemble globale" : `Magasin: ${user?.magasin_nom || 'N/A'}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              aria-label="Rafraîchir"
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {refreshing ? '⟳' : '⟳'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-xl mx-auto px-4 pt-28 space-y-4">
        {/* Stat row (mobile grid) */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            emoji="📥"
            label="Admissions"
            value={stats.totalAdmissions}
            badge={`+${stats.admissionsRecentes.length}`}
            small
          />
          <StatCard
            emoji="📤"
            label="Retraits"
            value={stats.totalRetraits}
            badge={`${stats.retraitsRecents.length} récents`}
            small
          />
          <StatCard
            emoji="🔄"
            label="Transferts"
            value={stats.totalTransferts}
            badge="Inter-magasins"
            small
          />
          <StatCard
            emoji="💰"
            label="Valeur stock"
            value={`${stats.valeurStock.toLocaleString()} FCFA`}
            badge={`${(stocks || []).length} lots`}
            small
          />
        </div>

        {/* Alertes */}
        {stats.alertesStock.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-yellow-800">Alertes stock faible</h3>
                  <span className="text-xs text-yellow-700">{stats.alertesStock.length}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {stats.alertesStock.slice(0, 5).map((s, i) => (
                    <p key={i} className="text-yellow-800 text-sm">
                      • <strong>{s.description}</strong> : {s.stock_actuel} {s.unite}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent activities */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">Activités récentes</h2>
            <button
              onClick={onRefresh}
              className="text-sm text-primary hover:underline"
              aria-label="Rafraîchir activités"
            >
              Rafraîchir
            </button>
          </div>

          <div className="grid gap-3">
            <div className="bg-white rounded-2xl p-3 shadow">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📥 Admissions récentes</h3>
              {stats.admissionsRecentes.length === 0 ? (
                <p className="text-gray-500 text-center py-6">Aucune admission récente</p>
              ) : (
                <div className="space-y-2">
                  {stats.admissionsRecentes.map(a => (
                    <SmallListItem
                      key={a.id}
                      title={a.lot_description || 'N/A'}
                      subtitle={`${a.nom_producteur} • ${a.quantite} ${a.unite}`}
                      right={`${(a.quantite * (a.prix_ref || 0)).toLocaleString()} FCFA\n${new Date(a.date_reception).toLocaleDateString()}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-3 shadow">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📤 Retraits récents</h3>
              {stats.retraitsRecents.length === 0 ? (
                <p className="text-gray-500 text-center py-6">Aucun retrait récent</p>
              ) : (
                <div className="space-y-2">
                  {stats.retraitsRecents.map(r => (
                    <SmallListItem
                      key={r.id}
                      title={r.lot_description || 'N/A'}
                      subtitle={`${r.quantite} ${r.unite}`}
                      right={`${r.type_retrait} • ${new Date(r.date_retrait || Date.now()).toLocaleDateString()}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Top produits */}
        <section className="bg-white rounded-2xl p-3 shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Top 10 produits en stock</h3>
          <div className="space-y-2">
            {(stocks || []).slice(0, 10).map((stock, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{stock.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{stock.categorie}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">{stock.stock_actuel} {stock.unite}</p>
                  <p className="text-xs text-gray-500">{(stock.stock_actuel * (stock.prix_ref || 0)).toLocaleString()} FCFA</p>
                </div>
              </div>
            ))}
            {(stocks || []).length === 0 && <p className="text-gray-500 text-center py-4">Aucun stock disponible</p>}
          </div>
        </section>

        {/* Actions rapides (grid) */}
        <section className="bg-white rounded-2xl p-3 shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡ Actions rapides</h3>
          <div className="grid grid-cols-4 gap-2">
            <button className="flex flex-col items-center gap-1 p-2 bg-green-50 rounded-lg">
              <div className="text-2xl">📥</div>
              <div className="text-xs font-medium">Admission</div>
            </button>
            <button className="flex flex-col items-center gap-1 p-2 bg-blue-50 rounded-lg">
              <div className="text-2xl">📤</div>
              <div className="text-xs font-medium">Retrait</div>
            </button>
            <button className="flex flex-col items-center gap-1 p-2 bg-purple-50 rounded-lg">
              <div className="text-2xl">🔄</div>
              <div className="text-xs font-medium">Transfert</div>
            </button>
            <button className="flex flex-col items-center gap-1 p-2 bg-orange-50 rounded-lg">
              <div className="text-2xl">📊</div>
              <div className="text-xs font-medium">Stock</div>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="max-w-xl mx-auto px-4 py-2 flex items-center justify-between">
          <button className="flex flex-col items-center text-xs text-gray-700">
            <span className="text-xl">🏠</span>
            <span>Accueil</span>
          </button>
          <button className="flex flex-col items-center text-xs text-gray-700">
            <span className="text-xl">📋</span>
            <span>Lots</span>
          </button>
          <button className="flex flex-col items-center text-xs text-gray-700">
            <span className="text-xl">🔍</span>
            <span>Rechercher</span>
          </button>
          <button className="flex flex-col items-center text-xs text-gray-700">
            <span className="text-xl">⚙️</span>
            <span>Profil</span>
          </button>
        </div>
      </nav>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="animate-spin mb-2">⟳</div>
            <div className="text-sm text-gray-700">Chargement...</div>
          </div>
        </div>
      )}
    </div>
  );
}