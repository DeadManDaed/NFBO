import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCapacitorContext } from './CapacitorProvider';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { isNative, platform } = useCapacitorContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Fermé par défaut sur mobile

  // 🧠 Système de mémoire du scroll
  const scrollPositions = useRef({});

  useEffect(() => {
    const currentPath = location.pathname;

    // 1. Appliquer la position sauvegardée (ou 0 si première visite)
    const savedPosition = scrollPositions.current[currentPath] || 0;
    
    // Petit timeout pour laisser à React le temps de rendre le contenu
    const timer = setTimeout(() => {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    }, 10);

    // 2. Nettoyage : Avant de changer de route, on sauvegarde la position actuelle
    return () => {
      scrollPositions.current[currentPath] = window.scrollY;
      clearTimeout(timer);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      await logout();
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: '🏠' },
    { path: '/lots', label: 'Définition lots', icon: '📋' },
    { path: '/admissions', label: 'Admissions', icon: '📥' },
    { path: '/retraits', label: 'Retraits', icon: '📤' },
    { path: '/transferts', label: 'Transferts', icon: '🔄' },
    { path: '/stock', label: 'Stock', icon: '📦' },
    { path: '/audit', label: 'Audit', icon: '🔍', roles: ['admin', 'superadmin'] },
    { path: '/administration', label: 'Administration', icon: '⚙️', roles: ['superadmin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  });

  return (
    <div className="min-h-screen bg-gray-900"> {/* Fond sombre pour éviter les flashs blancs */}
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <span className="text-2xl">{sidebarOpen ? '✕' : '☰'}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌿</span>
              <h1 className="text-lg font-extrabold text-gray-800 tracking-tight">NFBO</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-500 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex pt-[60px]"> {/* Padding top pour compenser le header fixe */}
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out pt-[60px] lg:pt-0`}
        >
          <nav className="p-4 space-y-1.5">
            {filteredMenuItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-green-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-semibold text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay Mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 w-full lg:pl-64 min-h-[calc(100vh-60px)] bg-gray-50">
          <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
