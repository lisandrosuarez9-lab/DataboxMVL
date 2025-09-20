import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/stores';
import Header from './Header';
import Footer from './Footer';
import { clsx } from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme } = useSelector((state: RootState) => state.ui);

  return (
    <div className={clsx('min-h-screen flex flex-col', theme === 'dark' && 'dark')} data-theme={theme}>
      <Header />
      <main className="flex-1 bg-gradient-to-br from-brand-primary to-brand-secondary">
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;