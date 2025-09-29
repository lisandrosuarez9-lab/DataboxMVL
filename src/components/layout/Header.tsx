import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores';
import { logout } from '@/stores/slices/userSlice';
import { toggleTheme } from '@/stores/slices/uiSlice';
import { Button } from '@/components/ui';
import { clsx } from 'clsx';

const Header: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const { theme } = useSelector((state: RootState) => state.ui);

  const navigation = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Reports', href: '/reports', icon: '📈' },
    { name: 'Diagnostics', href: '/diagnostics', icon: '🔍' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <header className="bg-white shadow-soft border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🛡️</span>
              <span className="font-bold text-xl text-brand-primary">
                DataboxMVL
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-brand-primary text-white'
                      : 'text-gray-600 hover:text-brand-primary hover:bg-gray-100'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User actions */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <button
              onClick={handleThemeToggle}
              className="p-2 text-gray-600 hover:text-brand-primary transition-colors duration-200"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="text-lg">
                {theme === 'light' ? '🌙' : '☀️'}
              </span>
            </button>

            {/* User info */}
            {currentUser && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {currentUser.email}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-gray-600 hover:text-brand-primary hover:bg-gray-100'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;