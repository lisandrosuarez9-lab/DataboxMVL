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
import { DiagnosticsDashboard } from '@/components/DiagnosticsDashboard';
import ShowcaseHome from '@/pages/showcase/ShowcaseHome';
import CreditStructure from '@/pages/showcase/CreditStructure';
import RiskSealIntegration from '@/pages/showcase/RiskSealIntegration';
import AlternateScoring from '@/pages/showcase/AlternateScoring';
import Sandbox from '@/pages/showcase/Sandbox';
import ComplianceAudits from '@/pages/showcase/ComplianceAudits';
import { FactoraPage } from '@/pages/FactoraPage';
import '@/styles/globals.css';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <Router basename="/DataboxMVL">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Factora Single-CTA Page - Standalone, no layout */}
            <Route path="/factora" element={<FactoraPage />} />
            
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
            
            <Route path="/diagnostics" element={
              <ProtectedRoute>
                <DiagnosticsDashboard />
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
            
            {/* Showcase Routes - Public */}
            <Route path="/showcase" element={
              <Layout>
                <ShowcaseHome />
              </Layout>
            } />
            
            <Route path="/showcase/credit-structure" element={
              <Layout>
                <CreditStructure />
              </Layout>
            } />
            
            <Route path="/showcase/riskseal" element={
              <Layout>
                <RiskSealIntegration />
              </Layout>
            } />
            
            <Route path="/showcase/alternate-scoring" element={
              <Layout>
                <AlternateScoring />
              </Layout>
            } />
            
            <Route path="/showcase/sandbox" element={
              <Layout>
                <Sandbox />
              </Layout>
            } />
            
            <Route path="/showcase/compliance" element={
              <Layout>
                <ComplianceAudits />
              </Layout>
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