import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { 
  Home, 
  Plus, 
  FileText, 
  CheckSquare, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Ticket,
  CheckCircle 
} from 'lucide-react';

const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, roles: ['employee', 'support_staff', 'admin', 'manager'] },
    { name: 'Create Ticket', href: '/tickets/create', icon: Plus, roles: ['employee', 'support_staff', 'admin', 'manager'] },
    { name: 'My Tickets', href: '/tickets', icon: Ticket, roles: ['employee', 'support_staff', 'admin', 'manager'] },
    { name: 'Ticket Approvals', href: '/admin/approvals', icon: CheckCircle, roles: ['admin'] },
    { name: 'User Management', href: '/users', icon: Users, roles: ['admin'] },

  ];

  const filteredNavigation = navigation.filter(item => 
    user && item.roles.includes(user.role)
  );

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img 
                src="/hit.png" 
                alt="HIT Logo" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="w-8 h-8 bg-blue-600 rounded-lg items-center justify-center hidden">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div className="text-gray-900">
                <div className="text-lg font-bold">HIT-TMS</div>
                <div className="text-xs text-gray-500">HIT-Ticket Management System</div>
              </div>
            </div>
          </div>

          {/* User Profile Section - Moved to Top */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {user?.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role.replace('_', ' ')}
                  {user?.factory && ` • ${user.factory.name}`}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button - Moved to Bottom */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Header with Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <img 
                src="/hit.png" 
                alt="HIT Logo" 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="w-6 h-6 bg-blue-600 rounded items-center justify-center hidden">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm font-semibold text-gray-900">HIT-TMS</div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile User Profile - Moved to Top */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {user?.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role.replace('_', ' ')}
                  {user?.factory && ` • ${user.factory.name}`}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Logout Button - Moved to Bottom */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <img 
                  src="/hit.png" 
                  alt="HIT Logo" 
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="text-lg font-bold text-gray-900">HIT-TMS</div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;