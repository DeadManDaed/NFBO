//src/pages/login.jsx

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../hooks/useAlert';
import Alert from '../components/Alert';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { alert, showAlert, hideAlert } = useAlert();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData);
      showAlert('✅ Connexion réussie', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error) {
      showAlert(`❌ ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-500 to-secondary flex items-center justify-center p-6">
      <Alert message={alert?.message} type={alert?.type} onClose={hideAlert} />

      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-3xl font-bold text-gray-800">NBFO</h1>
          <p className="text-gray-600 mt-2">Gestion Coopérative Agricole</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium text-gray-700 mb-2">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Entrez votre nom d'utilisateur"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Entrez votre mot de passe"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-lg transition-all ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connexion en cours...
              </span>
            ) : (
              '🔐 Se connecter'
            )}
          </button>
        </form>

        {/* Lien mot de passe oublié */}
        <div className="mt-6 text-center">
          <a href="#" className="text-primary hover:underline text-sm">
            Mot de passe oublié ?
          </a>
        </div>

        {/* Informations */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800 text-center">
            <strong>💡 Astuce :</strong> Utilisez vos identifiants fournis par l'administrateur
          </p>
        </div>
      </div>
    </div>
  );
}