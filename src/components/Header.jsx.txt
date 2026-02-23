//src/components/Header.jsx

export default function Header() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-5xl">📦</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestion des Stocks</h1>
            <p className="text-gray-600">Administration et suivi des lots</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all">
            🏠 Tableau de bord
          </button>
          <button className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all">
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}