import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/stores';
import { Layout } from '@/components/layout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/styles/globals.css';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes with layout */}
            <Route path="/" element={
              <Layout>
                <HomePage />
              </Layout>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">📈 Reports</h1>
                    <p className="text-gray-600">Reports functionality coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">⚙️ Settings</h1>
                    <p className="text-gray-600">Settings functionality coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </Provider>
  );
};

export default App;