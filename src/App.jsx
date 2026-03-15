// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// ─── Composant de Chargement (évite l'écran noir) ─────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a2e1a 0%, #1a3a1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'sans-serif'
    }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>📦</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#4caf50' }}>NFBO App</div>
      <p style={{ marginTop: 10, color: '#aaa', fontSize: 13 }}>Vérification de la session...</p>
    </div>
  );
}

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
          <button onClick={() => window.location.href = '/'} style={{ marginTop: 20, padding: '10px 20px', background: '#4caf50', border: 'none', color: 'white', borderRadius: 5 }}>
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Redirection intelligente depuis / ────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

// ─── Route login : redirige vers dashboard si déjà connecté ──────────────────
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
      <Router>
        <AuthProvider>
          <CapacitorProvider>
            <Routes>
              {/* ── Page de connexion ── */}
              <Route path="/login" element={<LoginRoute />} />

              {/* ── Dashboard principal (Route directe) ── */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* ── Routes secondaires avec layout ── */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
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

              {/* ── Confirmation email ── */}
              <Route path="/confirmed" element={<ConfirmedPage />} />

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </CapacitorProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

// ─── Page de confirmation email ───────────────────────────────────────────────
function ConfirmedPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a2e1a, #2d5a2d)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--color-surface, #1e2d1e)',
        borderRadius: 20, padding: '40px 32px',
        maxWidth: 400, width: '100%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: 'var(--color-primary, #4caf50)', marginTop: 0 }}>
          Email confirmé !
        </h2>
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
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          🔐 Aller à la connexion
        </button>
      </div>
    </div>
  );
}

export default App;
