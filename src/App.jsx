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

// ─── Redirection intelligente depuis / ────────────────────────────────────────
// Si authentifié → /dashboard, sinon → /login
function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

// ─── Route login : redirige vers dashboard si déjà connecté ──────────────────
function LoginRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }
  return <Login />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <AuthProvider>
        <CapacitorProvider>
          <Routes>

            {/* ── Page de connexion ── */}
            <Route path="/login" element={<LoginRoute />} />

            {/* ── Dashboard principal ── */}
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
              <Route path="lots"        element={
                <ProtectedRoute roles={['superadmin', 'admin', 'stock']}>
                  <DefinitionLots />
                </ProtectedRoute>
              } />
              <Route path="admissions"  element={
                <ProtectedRoute roles={['superadmin', 'admin', 'stock']}>
                  <Admissions />
                </ProtectedRoute>
              } />
              <Route path="retraits"    element={
                <ProtectedRoute roles={['superadmin', 'admin', 'stock']}>
                  <Retraits />
                </ProtectedRoute>
              } />
              <Route path="transferts"  element={
                <ProtectedRoute roles={['superadmin', 'admin']}>
                  <Transferts />
                </ProtectedRoute>
              } />
              <Route path="stock"       element={
                <ProtectedRoute roles={['superadmin', 'admin', 'stock', 'caisse']}>
                  <Stock />
                </ProtectedRoute>
              } />
              <Route path="audit"       element={
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

            {/* ── Confirmation email (deep link depuis le mail) ── */}
            <Route path="/confirmed" element={<ConfirmedPage />} />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </CapacitorProvider>
      </AuthProvider>
    </Router>
  );
}

// ─── Page de confirmation email ───────────────────────────────────────────────
function ConfirmedPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

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
        <a
          href="/login"
          style={{
            display: 'inline-block', padding: '12px 28px',
            background: 'var(--color-primary, #4caf50)',
            color: 'white', borderRadius: 10, textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          🔐 Aller à la connexion
        </a>
      </div>
    </div>
  );
}

export default App;