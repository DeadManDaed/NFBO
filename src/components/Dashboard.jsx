//src/components/Dashboard.jsx


import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCapacitorContext } from './CapacitorProvider';

export default function DashboardLayout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { isNative, platform } = useCapacitorContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-500 to-secondary">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="text-2xl">{sidebarOpen ? '✖' : '☰'}</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-4xl">📦</div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">NBFO</h1>
                <p className="text-sm text-gray-600">
                  {user?.nom || user?.username}
                  {isNative && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {platform}
                  </span>}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transition-transform duration-300 mt-[73px] lg:mt-0`}
        >
          <nav className="p-4 space-y-2">
            {filteredMenuItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                {user?.nom?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{user?.nom || user?.username}</p>
                <p className="text-sm text-gray-600 truncate">
                  {user?.role === 'superadmin' ? 'Super Admin' :
                   user?.role === 'admin' ? 'Administrateur' :
                   user?.role || 'Utilisateur'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay pour mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}