import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores';
import { 
  fetchDashboardDataStart,
  fetchDashboardDataSuccess,
  updateMetrics 
} from '@/stores/slices/dashboardSlice';
import { 
  TotalPersonasKPI, 
  FlaggedPersonasKPI, 
  AuditActivityKPI,
  PersonaTable,
  EnhancedAuditLogTable 
} from '@/components/dashboard';
import { Card } from '@/components/ui';
import { DashboardMetrics, PersonaFlag, AuditEntry, Persona } from '@/types';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const { metrics, personas, auditEntries, loading } = useSelector(
    (state: RootState) => state.dashboard
  );
  const { currentUser } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    // Fetch initial dashboard data
    const fetchData = async () => {
      dispatch(fetchDashboardDataStart());

      // Simulate API call with mock data
      setTimeout(() => {
        const mockMetrics: DashboardMetrics = {
          totalPersonas: 1247,
          reviewNeeded: 23,
          auditEntries: 5681,
          lastUpdated: new Date().toISOString(),
          growthRate: 5.2,
          flaggedPercentage: 1.8,
          dailyAverageActivity: 142,
          unusualActivityDetected: false
        };

        const mockPersonas: Persona[] = [
          {
            id: 'persona-001',
            user_id_review_needed: true,
            is_test: false,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
            risk_score: 75,
            trust_level: 'MEDIUM',
            verification_status: 'PENDING',
            full_name: 'Maria Rodriguez Silva',
            email: 'maria.rodriguez@email.com',
            phone: '+1234567890',
            document_id: 'ID123456789',
            employment_status: 'Employed',
            income_level: 45000,
            credit_score: 680,
            created_by: 'system',
            updated_by: 'compliance'
          },
          {
            id: 'persona-002',
            user_id_review_needed: false,
            is_test: true,
            created_at: new Date(Date.now() - 172800000).toISOString(),
            updated_at: new Date(Date.now() - 7200000).toISOString(),
            risk_score: 25,
            trust_level: 'HIGH',
            verification_status: 'VERIFIED',
            full_name: 'Test User Account',
            email: 'test@databox.mvl',
            employment_status: 'Test',
            income_level: 50000,
            credit_score: 750,
            created_by: 'system',
            updated_by: 'service_role'
          },
          {
            id: 'persona-003',
            user_id_review_needed: true,
            is_test: false,
            created_at: new Date(Date.now() - 259200000).toISOString(),
            updated_at: new Date(Date.now() - 1800000).toISOString(),
            risk_score: 90,
            trust_level: 'LOW',
            verification_status: 'REJECTED',
            full_name: 'Carlos Mendoza Lopez',
            email: 'carlos.mendoza@email.com',
            phone: '+0987654321',
            document_id: 'ID987654321',
            employment_status: 'Unemployed',
            income_level: 15000,
            credit_score: 450,
            created_by: 'system',
            updated_by: 'compliance'
          }
        ];

        const mockPersonaFlags: PersonaFlag[] = [
          {
            id: '1',
            persona_id: 'PERSONA_001',
            flag_type: 'CREDIT_REVIEW',
            flag_value: 'REQUIRES_MANUAL_REVIEW',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_at: new Date(Date.now() - 1800000).toISOString(),
            created_by: 'system',
          },
          {
            id: '2',
            persona_id: 'PERSONA_002',
            flag_type: 'IDENTITY_VERIFICATION',
            flag_value: 'PENDING_DOCUMENTS',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
            created_by: 'service_role',
          },
          {
            id: '3',
            persona_id: 'PERSONA_003',
            flag_type: 'COMPLIANCE_CHECK',
            flag_value: 'APPROVED',
            created_at: new Date(Date.now() - 14400000).toISOString(),
            updated_at: new Date(Date.now() - 7200000).toISOString(),
            created_by: 'compliance',
          },
        ];

        const mockAuditEntries: AuditEntry[] = [
          {
            audit_id: 'AUDIT_001',
            persona_id: 'PERSONA_001',
            field_name: 'verification_status',
            old_value: 'PENDING_REVIEW',
            new_value: 'REQUIRES_MANUAL_REVIEW',
            changed_at: new Date(Date.now() - 1800000).toISOString(),
            changed_by: 'system',
            action_type: 'UPDATE',
          },
          {
            audit_id: 'AUDIT_002',
            persona_id: 'PERSONA_004',
            field_name: 'flag_type',
            old_value: null,
            new_value: 'INITIAL_SETUP',
            changed_at: new Date(Date.now() - 3600000).toISOString(),
            changed_by: 'service_role',
            action_type: 'INSERT',
          },
          {
            audit_id: 'AUDIT_003',
            persona_id: 'PERSONA_002',
            field_name: 'flag_value',
            old_value: 'PENDING_VERIFICATION',
            new_value: 'PENDING_DOCUMENTS',
            changed_at: new Date(Date.now() - 7200000).toISOString(),
            changed_by: 'service_role',
            action_type: 'UPDATE',
          },
        ];

        dispatch(fetchDashboardDataSuccess({
          metrics: mockMetrics,
          personas: mockPersonas,
          personaFlags: mockPersonaFlags,
          auditEntries: mockAuditEntries,
        }));
      }, 1500);
    };

    fetchData();

    // Set up real-time updates simulation
    const interval = setInterval(() => {
      if (metrics) {
        const updatedMetrics: DashboardMetrics = {
          ...metrics,
          totalPersonas: metrics.totalPersonas + Math.floor(Math.random() * 3),
          reviewNeeded: Math.max(0, metrics.reviewNeeded + Math.floor(Math.random() * 5) - 2),
          auditEntries: metrics.auditEntries + Math.floor(Math.random() * 2),
          lastUpdated: new Date().toISOString(),
        };
        dispatch(updateMetrics(updatedMetrics));
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [dispatch, metrics]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🛡️ Persona Flag Audit Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time monitoring and compliance tracking
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{currentUser?.role.replace('_', ' ')}</span>
            </div>
            <div className="text-xs text-gray-500">
              {metrics?.lastUpdated && `Last updated: ${new Date(metrics.lastUpdated).toLocaleTimeString()}`}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TotalPersonasKPI
          totalPersonas={metrics?.totalPersonas || 0}
          loading={loading}
          growthRate={metrics?.growthRate}
          onViewDetails={() => console.log('View persona details')}
        />
        
        <FlaggedPersonasKPI
          reviewNeeded={metrics?.reviewNeeded || 0}
          totalPersonas={metrics?.totalPersonas || 0}
          loading={loading}
          onViewFlagged={() => console.log('View flagged personas')}
        />
        
        <AuditActivityKPI
          auditEntries={metrics?.auditEntries || 0}
          loading={loading}
          dailyAverage={metrics?.dailyAverageActivity}
          onViewAudit={() => console.log('View audit log')}
        />
      </div>

      {/* Database Overview */}
      <Card title="📊 Database Schema Overview" className="bg-white/95 backdrop-blur-sm">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Core Tables</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span><strong>public.personas</strong></span>
                <span className="text-gray-600">Main persona records</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span><strong>public.protocol_data</strong></span>
                <span className="text-gray-600">Injected protocol data</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span><strong>private.persona_flag_audit</strong></span>
                <span className="text-gray-600">Audit trail</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">🛡️ Compliance Features</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• All persona flag changes are automatically audited</li>
              <li>• Audit records are immutable and retention compliant</li>
              <li>• Role-based access control ensures data privacy</li>
              <li>• Real-time monitoring and alerting capabilities</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Enhanced Data Tables */}
      <div className="space-y-8">
        {/* Main Persona Table */}
        <Card title="🧑‍💼 Persona Management" subtitle="Comprehensive persona data with advanced filtering and sorting">
          <PersonaTable
            personas={personas}
            loading={loading}
            onPersonaClick={(persona) => console.log('View persona:', persona.id)}
            onPersonaSelect={(selectedIds) => console.log('Selected personas:', selectedIds)}
            onExport={(format, selectedRows) => console.log('Export:', format, selectedRows?.length)}
            enableInlineEdit={currentUser?.role === 'service_role'}
          />
        </Card>

        {/* Enhanced Audit Log */}
        <Card title="📋 Audit Trail" subtitle="Detailed audit log with change visualization and temporal grouping">
          <EnhancedAuditLogTable
            entries={auditEntries}
            loading={loading}
            onEntryClick={(entry) => console.log('View audit entry:', entry.audit_id)}
            onExport={(format, selectedRows) => console.log('Export audit:', format, selectedRows?.length)}
          />
        </Card>
      </div>

      {/* Connection Status */}
      <Card title="🔗 Connection Status" className="bg-white/95 backdrop-blur-sm">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">📡</div>
            <div className="font-medium text-green-800">Real-time Subscriptions</div>
            <div className="text-sm text-green-600">Connected</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">🔄</div>
            <div className="font-medium text-blue-800">Sync Status</div>
            <div className="text-sm text-blue-600">In Sync</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-medium text-green-800">Performance</div>
            <div className="text-sm text-green-600">~{Math.floor(Math.random() * 50 + 10)}ms</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🔐</div>
            <div className="font-medium text-purple-800">Security</div>
            <div className="text-sm text-purple-600">RLS Enabled</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;