//src/App.jsx

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
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

function App() {
  return (
    <Router>
      <AuthProvider>
        <CapacitorProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* ─── Dashboard : route autonome, SANS DashboardLayout ─────────
                Le Dashboard gère lui-même sa navigation par tab bar interne.
                DashboardLayout (header + hamburger) ne s'affiche plus ici.   */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            {/* ─── Autres routes : gardent DashboardLayout si besoin ────────
                À terme ces routes peuvent être supprimées car Dashboard
                charge les modules en interne. Elles restent pour compatibilité
                avec d'éventuels liens directs ou deep links Capacitor.        */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="lots" element={<DefinitionLots />} />
              <Route path="admissions" element={<Admissions />} />
              <Route path="retraits" element={<Retraits />} />
              <Route path="transferts" element={<Transferts />} />
              <Route path="stock" element={<Stock />} />
              <Route path="audit" element={<Audit />} />
              <Route path="administration" element={
                <ProtectedRoute roles={['superadmin']}>
                  <Administration />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </CapacitorProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
