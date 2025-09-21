import React, { useMemo } from 'react';
import { VirtualizedTable } from '@/components/ui/VirtualizedTable';
import { AuditEntry, TableColumn } from '@/types';
import { clsx } from 'clsx';

interface AuditLogTableProps {
  entries: AuditEntry[];
  loading?: boolean;
  error?: string;
  onEntryClick?: (entry: AuditEntry) => void;
  onExport?: (format: 'csv' | 'excel', selectedRows?: AuditEntry[]) => void;
}

// Utility functions for rendering audit data
const formatActionType = (action: AuditEntry['action_type']) => {
  const config = {
    INSERT: { color: 'text-green-800 bg-green-100', label: 'INSERT', icon: '➕' },
    UPDATE: { color: 'text-blue-800 bg-blue-100', label: 'UPDATE', icon: '✏️' },
    DELETE: { color: 'text-red-800 bg-red-100', label: 'DELETE', icon: '🗑️' }
  };

  const { color, label, icon } = config[action];
  return (
    <span className={clsx('inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full', color)}>
      <span className="mr-1">{icon}</span>
      {label}
    </span>
  );
};

const formatChangeMagnitude = (magnitude?: AuditEntry['change_magnitude']) => {
  if (!magnitude) return null;
  
  const config = {
    MINOR: { color: 'text-green-600 bg-green-50', label: 'Minor' },
    MAJOR: { color: 'text-orange-600 bg-orange-50', label: 'Major' },
    CRITICAL: { color: 'text-red-600 bg-red-50', label: 'Critical' }
  };

  const { color, label } = config[magnitude];
  return (
    <span className={clsx('inline-flex px-2 py-1 text-xs font-semibold rounded-full', color)}>
      {label}
    </span>
  );
};

const formatFieldName = (fieldName: string) => {
  // Convert field names to human-readable format
  const fieldMappings: Record<string, string> = {
    'user_id_review_needed': 'Review Status',
    'is_test': 'Test Flag',
    'risk_score': 'Risk Score',
    'trust_level': 'Trust Level',
    'verification_status': 'Verification Status',
    'created_at': 'Created Date',
    'updated_at': 'Updated Date',
    'full_name': 'Full Name',
    'email': 'Email Address',
    'phone': 'Phone Number',
    'document_id': 'Document ID',
    'employment_status': 'Employment Status',
    'income_level': 'Income Level',
    'credit_score': 'Credit Score'
  };

  return fieldMappings[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatValue = (value: string | null, fieldName: string) => {
  if (value === null) return <span className="text-gray-400">null</span>;
  
  // Format specific field types
  if (fieldName === 'user_id_review_needed' || fieldName === 'is_test') {
    return value === 'true' ? 'Yes' : 'No';
  }
  
  if (fieldName === 'risk_score' && !isNaN(Number(value))) {
    return Number(value).toFixed(1);
  }
  
  if (fieldName.includes('_at') && value) {
    return new Date(value).toLocaleString();
  }
  
  return String(value);
};

const renderValueDiff = (oldValue: string | null, newValue: string, fieldName: string) => {
  const oldFormatted = formatValue(oldValue, fieldName);
  const newFormatted = formatValue(newValue, fieldName);
  
  return (
    <div className="space-y-1">
      {oldValue && (
        <div className="text-xs">
          <span className="text-gray-500">From:</span>
          <span className="ml-1 text-red-600 line-through">{oldFormatted}</span>
        </div>
      )}
      <div className="text-xs">
        <span className="text-gray-500">To:</span>
        <span className="ml-1 text-green-600 font-medium">{newFormatted}</span>
      </div>
    </div>
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  let relative = '';
  if (diffDays > 0) relative = `${diffDays}d ago`;
  else if (diffHours > 0) relative = `${diffHours}h ago`;
  else if (diffMinutes > 0) relative = `${diffMinutes}m ago`;
  else relative = 'Just now';

  return {
    absolute: date.toLocaleString(),
    relative
  };
};

const formatChangedBy = (changedBy: string) => {
  return (
    <div className="flex items-center">
      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-700 mr-2">
        {changedBy.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-gray-900">{changedBy}</span>
    </div>
  );
};

const formatMetadata = (metadata?: Record<string, any>) => {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  
  return (
    <details className="cursor-pointer">
      <summary className="text-xs text-gray-500 hover:text-gray-700">
        View metadata ({Object.keys(metadata).length} fields)
      </summary>
      <pre className="mt-1 text-xs bg-gray-50 p-2 rounded border max-w-xs overflow-auto">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    </details>
  );
};

const EnhancedAuditLogTable: React.FC<AuditLogTableProps> = ({
  entries,
  loading = false,
  error,
  onEntryClick,
  onExport
}) => {
  const columns: TableColumn<AuditEntry>[] = useMemo(() => [
    {
      id: 'changed_at',
      label: 'Time',
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: 150,
      render: (value: string) => {
        const { absolute, relative } = formatDate(value);
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{relative}</div>
            <div className="text-gray-500 text-xs" title={absolute}>
              {new Date(value).toLocaleTimeString()}
            </div>
          </div>
        );
      }
    },
    {
      id: 'action_type',
      label: 'Action',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'INSERT', label: 'Insert' },
        { value: 'UPDATE', label: 'Update' },
        { value: 'DELETE', label: 'Delete' }
      ],
      width: 100,
      render: (value: AuditEntry['action_type']) => formatActionType(value)
    },
    {
      id: 'persona_id',
      label: 'Persona ID',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value: string) => (
        <div className="flex items-center">
          <span 
            className="font-mono text-sm text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
            title="Click to view persona details"
          >
            {value.substring(0, 8)}...
          </span>
        </div>
      )
    },
    {
      id: 'field_name',
      label: 'Field',
      sortable: true,
      filterable: true,
      width: 140,
      render: (value: string) => (
        <span className="text-sm font-medium text-gray-900">
          {formatFieldName(value)}
        </span>
      )
    },
    {
      id: 'new_value',
      label: 'Change',
      sortable: false,
      filterable: false,
      width: 200,
      render: (value: string, row: AuditEntry) => renderValueDiff(row.old_value, value, row.field_name)
    },
    {
      id: 'change_magnitude',
      label: 'Impact',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'MINOR', label: 'Minor' },
        { value: 'MAJOR', label: 'Major' },
        { value: 'CRITICAL', label: 'Critical' }
      ],
      width: 100,
      render: (value: AuditEntry['change_magnitude']) => formatChangeMagnitude(value)
    },
    {
      id: 'changed_by',
      label: 'Changed By',
      sortable: true,
      filterable: true,
      width: 140,
      render: (value: string) => formatChangedBy(value)
    },
    {
      id: 'change_reason',
      label: 'Reason',
      sortable: false,
      filterable: true,
      width: 150,
      render: (value?: string) => (
        <span className="text-sm text-gray-700">
          {value || 'No reason provided'}
        </span>
      )
    },
    {
      id: 'client_metadata',
      label: 'Metadata',
      sortable: false,
      filterable: false,
      width: 120,
      render: (value?: Record<string, any>) => formatMetadata(value)
    }
  ], []);

  const bulkActions = useMemo(() => [
    {
      id: 'export-selected',
      label: 'Export Selected',
      icon: '📊',
      action: (selectedEntries: AuditEntry[]) => {
        onExport?.('csv', selectedEntries);
      }
    },
    {
      id: 'analyze-pattern',
      label: 'Analyze Pattern',
      icon: '🔍',
      action: (selectedEntries: AuditEntry[]) => {
        // TODO: Implement pattern analysis
        console.log('Analyzing pattern for entries:', selectedEntries.map(e => e.audit_id));
      }
    }
  ], [onExport]);

  return (
    <VirtualizedTable<AuditEntry>
      data={entries}
      columns={columns}
      loading={loading}
      error={error}
      emptyMessage="No audit entries found"
      onRowClick={onEntryClick}
      onExport={onExport}
      bulkActions={bulkActions}
      enableKeyboardNavigation={true}
      enableRowExpansion={true}
      rowHeight={80}
      overscan={10}
    />
  );
};

export default EnhancedAuditLogTable;