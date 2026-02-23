//src/pages/Stock.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStocks } from '../hooks/useStocks';
import api from '../services/api';

export default function Stock() {
  const { user, magasinId, isSuperAdmin } = useAuth();
  const [selectedMagasin, setSelectedMagasin] = useState(magasinId || '');
  const { stocks, loading, refresh } = useStocks(selectedMagasin);
  const [magasins, setMagasins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');

  useEffect(() => {
    loadMagasins();
  }, []);

  const loadMagasins = async () => {
    try {
      const data = await api.getMagasins();
      setMagasins(data);
    } catch (err) {
      console.error('Erreur chargement magasins:', err);
    }
  };

  // Filtrer les stocks
  const filteredStocks = stocks.filter(stock => {
    const matchSearch = stock.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategorie = !filterCategorie || stock.categorie === filterCategorie;
    return matchSearch && matchCategorie;
  });

  // Calcul des statistiques
  const totalLots = filteredStocks.length;
  const totalValeur = filteredStocks.reduce((sum, s) => sum + (s.stock_actuel * s.prix_ref), 0);
  const categories = [...new Set(stocks.map(s => s.categorie))];

  return (
    <div className="space-y-6">
      {/* Header et sélecteur */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📦 Stock disponible</h2>
            <p className="text-gray-600 mt-1">Consultation en temps réel</p>
          </div>
          
          {isSuperAdmin && (
            <div className="flex items-center gap-3">
              <label className="font-medium text-gray-700">Magasin :</label>
              <select
                value={selectedMagasin}
                onChange={(e) => setSelectedMagasin(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Tous les magasins</option>
                {magasins.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nom} ({m.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={refresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Lots en stock</p>
              <p className="text-3xl font-bold mt-2">{totalLots}</p>
            </div>
            <div className="text-5xl opacity-30">📦</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Valeur totale</p>
              <p className="text-3xl font-bold mt-2">{totalValeur.toLocaleString()} FCFA</p>
            </div>
            <div className="text-5xl opacity-30">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Catégories</p>
              <p className="text-3xl font-bold mt-2">{categories.length}</p>
            </div>
            <div className="text-5xl opacity-30">🏷️</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-gray-700 mb-2">
              🔍 Rechercher un produit
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom du produit..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">
              🏷️ Filtrer par catégorie
            </label>
            <select
              value={filterCategorie}
              onChange={(e) => setFilterCategorie(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des stocks */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Détail du stock ({filteredStocks.length} produits)
        </h3>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-bounce">📦</div>
            <p className="text-gray-600">Chargement du stock...</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-600">Aucun stock disponible</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Produit</th>
                  <th className="p-3 text-left">Catégorie</th>
                  <th className="p-3 text-right">Stock actuel</th>
                  <th className="p-3 text-right">Prix unitaire</th>
                  <th className="p-3 text-right">Valeur totale</th>
                  <th className="p-3 text-left">Unités admises</th>
                  <th className="p-3 text-left">Dernière réception</th>
                  <th className="p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock, index) => {
                  const valeurTotale = stock.stock_actuel * stock.prix_ref;
                  const stockFaible = stock.stock_actuel < 10;
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{stock.description}</td>
                      <td className="p-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {stock.categorie}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${stockFaible ? 'text-red-600' : 'text-gray-800'}`}>
                          {stock.stock_actuel} {stock.unite}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {stock.prix_ref.toLocaleString()} FCFA
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        {valeurTotale.toLocaleString()} FCFA
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {stock.unites_admises?.map(u => (
                            <span key={u} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {u}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {stock.derniere_reception ? 
                          new Date(stock.derniere_reception).toLocaleDateString() : 
                          'N/A'
                        }
                      </td>
                      <td className="p-3 text-center">
                        {stockFaible ? (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            ⚠️ Faible
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            ✓ OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alertes stock faible */}
      {filteredStocks.filter(s => s.stock_actuel < 10).length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h4 className="font-bold text-yellow-800 mb-2">
                Alertes de stock faible
              </h4>
              <ul className="space-y-1">
                {filteredStocks
                  .filter(s => s.stock_actuel < 10)
                  .map((stock, index) => (
                    <li key={index} className="text-yellow-700">
                      • <strong>{stock.description}</strong> : {stock.stock_actuel} {stock.unite}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}