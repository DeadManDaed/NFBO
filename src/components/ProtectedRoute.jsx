// src/components/ProtectedRoute.jsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a2e1a 0%, #1a3a1a 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>📦</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#4caf50' }}>NFBO</div>
      <p style={{ marginTop: 10, color: '#aaa', fontSize: 13 }}>Chargement...</p>
    </div>
  );
}

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();

  // Chargement initial uniquement — ne jamais rediriger pendant ce temps
  if (loading) return <LoadingScreen />;

  // Pas d'utilisateur après chargement complet → login
  if (!user) return <Navigate to="/login" replace />;

  // Rôle insuffisant
  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a2e1a, #1a3a1a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '40px 32px',
          maxWidth: 400, width: '100%', textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Accès refusé</h1>
          <p style={{ color: '#666', marginBottom: 24 }}>
            Vous n'avez pas les permissions nécessaires.
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 24px', background: '#1b6e2e',
              color: 'white', border: 'none', borderRadius: 8,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  return children;
}
