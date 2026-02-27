//src/App.jsx
alert('--- Début du bundle main.jsx ---');
/*import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
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
*/
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
import DebugApp from './pages/DebugApp'; // ⚠️ NOUVEAU

function App() {
  return (
    <Router>
      <Routes>
        {/* ⚠️ ROUTE DEBUG - Accessible sans auth */}
        <Route path="/debug" element={<DebugApp />} />

        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <AuthProvider>
            <CapacitorProvider>
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            </CapacitorProvider>
          </AuthProvider>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
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
    </Router>
  );
}
alert('--- App rendu ---');
// Ajout de handlers globaux pour capturer les erreurs
window.addEventListener('error', e => {
  alert('Erreur globale: ' + (e.error?.message || e.message));
});
window.addEventListener('unhandledrejection', e => {
  alert('Rejet non géré: ' + e.reason);
});
export default App;
