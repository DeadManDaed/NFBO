// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { CapacitorProvider } from './components/CapacitorProvider';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import DefinitionLots from './pages/DefinitionLots';
import Admissions from './pages/Admissions';
import Retraits from './pages/Retraits';
import Transferts from './pages/Transferts';
import Stock from './pages/Stock';
import Audit from './pages/Audit';
import Administration from './pages/Administration';
import React, { useEffect } from 'react';

// ─── Configuration de React Query ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // ← était true
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Écoute la déconnexion pour vider le cache React Query
window.addEventListener('auth:signout', () => {
  queryClient.clear();
});

// ─── Composant de Chargement ──────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1f0f 0%, #0f2d1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>📦</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#d4a017', letterSpacing: 4 }}>NFBO</div>
      <p style={{ marginTop: 12, color: '#8ab89a', fontSize: 13, letterSpacing: 1 }}>
        Vérification de la session...
      </p>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  componentDidCatch(error, info) {
    console.error('=== ERREUR CAPTURÉE ===', error.message, info.componentStack);
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#ff8a80', background: '#111', minHeight: '100vh' }}>
          <h2>Erreur détectée :</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: '#222', padding: 16, borderRadius: 8 }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.href = '/'}
            style={{ marginTop: 20, padding: '10px 20px', background: '#4caf50', border: 'none', color: 'white', borderRadius: 5 }}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Redirection depuis / ─────────────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

// ─── Route login ──────────────────────────────────────────────────────────────
function LoginRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    const from = location.state?.from || '/dashboard';
    return <Navigate to={from} state={null} replace />;
  }
  return <Login />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <CapacitorProvider>
              <Routes>
                <Route path="/login" element={<LoginRoute />} />

                <Route path="/dashboard" element={
                  <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />

                <Route path="/" element={
                  <ProtectedRoute><DashboardLayout /></ProtectedRoute>
                }>
                  <Route index element={<RootRedirect />} />
                  <Route path="lots" element={
                    <ProtectedRoute roles={['superadmin', 'admin', 'stock']}>
                      <DefinitionLots />
                    </ProtectedRoute>
                  } />
                  <Route path="admissions" element={
                    <ProtectedRoute roles={['superadmin', 'admin', 'stock']}>
                      <Admissions />
                    </ProtectedRoute>
                  } />
                  <Route path="retraits" element={
                    <ProtectedRoute roles={['superadmin', 'admin', 'stock']}>
                      <Retraits />
                    </ProtectedRoute>
                  } />
                  <Route path="transferts" element={
                    <ProtectedRoute roles={['superadmin', 'admin']}>
                      <Transferts />
                    </ProtectedRoute>
                  } />
                  <Route path="stock" element={
                    <ProtectedRoute roles={['superadmin', 'admin', 'stock', 'caisse']}>
                      <Stock />
                    </ProtectedRoute>
                  } />
                  <Route path="audit" element={
                    <ProtectedRoute roles={['superadmin', 'auditeur']}>
                      <Audit />
                    </ProtectedRoute>
                  } />
                  <Route path="administration" element={
                    <ProtectedRoute roles={['superadmin']}>
                      <Administration />
                    </ProtectedRoute>
                  } />
                </Route>

                <Route path="/confirmed" element={<ConfirmedPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </CapacitorProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// ─── Page confirmation email ──────────────────────────────────────────────────
function ConfirmedPage() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a2e1a, #2d5a2d)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--color-surface, #1e2d1e)', borderRadius: 20,
        padding: '40px 32px', maxWidth: 400, width: '100%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: 'var(--color-primary, #4caf50)', marginTop: 0 }}>Email confirmé !</h2>
        <p style={{ color: 'var(--color-text-muted, #aaa)', marginBottom: 24 }}>
          Votre adresse email a bien été vérifiée. Un administrateur doit encore
          activer votre compte avant votre première connexion.
        </p>
        <button
          onClick={() => window.location.href = '/login'}
          style={{
            display: 'inline-block', padding: '12px 28px',
            background: 'var(--color-primary, #4caf50)',
            color: 'white', borderRadius: 10, border: 'none',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          🔐 Aller à la connexion
        </button>
      </div>
    </div>
  );
}

export default App;
