import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { infrastructureMonitor } from '@/utils/monitoring';
import { initDiagnostics } from '@/frontend/lib/init-diagnostics';

// Initialize infrastructure monitoring
infrastructureMonitor.initialize();

// Initialize API diagnostics
initDiagnostics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);