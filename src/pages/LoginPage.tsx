import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '@/stores/slices/userSlice';
import { addNotification } from '@/stores/slices/uiSlice';
import { Button, Card } from '@/components/ui';
import { User } from '@/types';

const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'compliance' | 'service_role'>('compliance');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    
    // Simulate login process
    setTimeout(() => {
      const user: User = {
        id: Date.now().toString(),
        email: selectedRole === 'compliance' ? 'compliance@databox.mvl' : 'service@databox.mvl',
        role: selectedRole,
        permissions: selectedRole === 'service_role' 
          ? ['read', 'write', 'delete', 'audit'] 
          : ['read', 'audit'],
      };

      dispatch(loginSuccess(user));
      dispatch(addNotification({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back! You are logged in as ${selectedRole.replace('_', ' ')}.`,
      }));
      
      setLoading(false);
      navigate('/dashboard');
    }, 1000);
  };

  const navigateToDashboard = () => {
    // Quick demo access without formal login
    const demoUser: User = {
      id: 'demo',
      email: 'demo@databox.mvl',
      role: 'service_role',
      permissions: ['read', 'write', 'delete', 'audit'],
    };

    dispatch(loginSuccess(demoUser));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <Card className="text-center mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-brand-primary mb-2">
              🛡️ DataboxMVL Sovereign Protocol Suite
            </h1>
            <p className="text-lg text-gray-600">
              Identity-centric data injection with consent enforcement
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={navigateToDashboard} variant="primary" size="lg">
                📊 Persona Flag Audit Dashboard
              </Button>
              <Button onClick={() => handleLogin()} variant="secondary" size="lg">
                Login as {selectedRole.replace('_', ' ')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Login Section */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card title="🔐 Access Control" className="h-fit">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'compliance' | 'service_role')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent"
                >
                  <option value="compliance">Compliance (Read-only)</option>
                  <option value="service_role">Service Role (Full Access)</option>
                </select>
              </div>

              <Button
                onClick={handleLogin}
                loading={loading}
                className="w-full"
                variant="primary"
              >
                Login
              </Button>

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Compliance Role:</strong> Read-only access to audit data</p>
                <p><strong>Service Role:</strong> Full CRUD operations and audit capabilities</p>
              </div>
            </div>
          </Card>

          <Card title="🌟 Features" className="h-fit">
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <span>💰</span>
                <div>
                  <strong>Multi-Protocol Data Injection:</strong> Support for Microcrédito, Empleo, Ingreso, and Educación protocols
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span>📋</span>
                <div>
                  <strong>Audit Infrastructure:</strong> Complete audit trail with real-time monitoring
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span>🔒</span>
                <div>
                  <strong>Role-Based Access Control:</strong> Compliance and Service Role authentication
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span>📊</span>
                <div>
                  <strong>Real-time Dashboard:</strong> Live monitoring of persona flags and audit logs
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;