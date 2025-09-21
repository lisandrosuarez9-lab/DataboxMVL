import React, { useMemo } from 'react';
import { VirtualizedTable } from '@/components/ui/VirtualizedTable';
import { Persona, TableColumn } from '@/types';
import { clsx } from 'clsx';

interface PersonaTableProps {
  personas: Persona[];
  loading?: boolean;
  error?: string;
  onPersonaClick?: (persona: Persona) => void;
  onPersonaSelect?: (selectedIds: string[]) => void;
  onExport?: (format: 'csv' | 'excel', selectedRows?: Persona[]) => void;
  enableInlineEdit?: boolean;
}

// Utility functions for rendering persona data
const formatRiskScore = (score: number) => {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <span className={clsx('inline-flex px-2 py-1 text-xs font-semibold rounded-full', getColor(score))}>
      {score}
    </span>
  );
};

const formatTrustLevel = (level: Persona['trust_level']) => {
  const config = {
    LOW: { icon: '🔴', color: 'text-red-600 bg-red-50', label: 'Low' },
    MEDIUM: { icon: '🟡', color: 'text-yellow-600 bg-yellow-50', label: 'Medium' },
    HIGH: { icon: '🟢', color: 'text-green-600 bg-green-50', label: 'High' },
    VERIFIED: { icon: '✅', color: 'text-blue-600 bg-blue-50', label: 'Verified' }
  };

  const { icon, color, label } = config[level];
  return (
    <span className={clsx('inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full', color)}>
      <span className="mr-1">{icon}</span>
      {label}
    </span>
  );
};

const formatVerificationStatus = (status: Persona['verification_status']) => {
  const config = {
    PENDING: { color: 'text-gray-600 bg-gray-50', label: 'Pending' },
    IN_PROGRESS: { color: 'text-blue-600 bg-blue-50', label: 'In Progress' },
    VERIFIED: { color: 'text-green-600 bg-green-50', label: 'Verified' },
    REJECTED: { color: 'text-red-600 bg-red-50', label: 'Rejected' }
  };

  const { color, label } = config[status];
  return (
    <span className={clsx('inline-flex px-2 py-1 text-xs font-semibold rounded-full', color)}>
      {label}
    </span>
  );
};

const formatReviewNeeded = (needsReview: boolean) => {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full',
      needsReview ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
    )}>
      <span className={clsx('w-2 h-2 rounded-full mr-2', needsReview ? 'bg-red-500' : 'bg-green-500')}></span>
      {needsReview ? 'Review Needed' : 'OK'}
    </span>
  );
};

const formatIsTest = (isTest: boolean) => {
  if (!isTest) return null;
  return (
    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-blue-600 bg-blue-50">
      TEST
    </span>
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return {
    absolute: date.toLocaleString(),
    relative: getRelativeTime(date)
  };
};

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return 'Just now';
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // TODO: Show notification
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
};

const PersonaTable: React.FC<PersonaTableProps> = ({
  personas,
  loading = false,
  error,
  onPersonaClick,
  onPersonaSelect,
  onExport,
  enableInlineEdit = false
}) => {
  const columns: TableColumn<Persona>[] = useMemo(() => [
    {
      id: 'id',
      label: 'Persona ID',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value: string) => (
        <div className="flex items-center">
          <span 
            className="font-mono text-sm cursor-pointer hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(value);
            }}
            title="Click to copy"
          >
            {value.substring(0, 8)}...
          </span>
        </div>
      )
    },
    {
      id: 'user_id_review_needed',
      label: 'Review Status',
      sortable: true,
      filterable: true,
      filterType: 'boolean',
      width: 140,
      render: (value: boolean) => formatReviewNeeded(value)
    },
    {
      id: 'is_test',
      label: 'Test Flag',
      sortable: true,
      filterable: true,
      filterType: 'boolean',
      width: 100,
      render: (value: boolean) => formatIsTest(value)
    },
    {
      id: 'full_name',
      label: 'Full Name',
      sortable: true,
      filterable: true,
      width: 180,
      render: (value: string) => value || 'N/A'
    },
    {
      id: 'email',
      label: 'Email',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value: string) => value || 'N/A'
    },
    {
      id: 'risk_score',
      label: 'Risk Score',
      sortable: true,
      filterable: true,
      filterType: 'range',
      width: 120,
      render: (value: number) => formatRiskScore(value)
    },
    {
      id: 'trust_level',
      label: 'Trust Level',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'VERIFIED', label: 'Verified' }
      ],
      width: 120,
      render: (value: Persona['trust_level']) => formatTrustLevel(value)
    },
    {
      id: 'verification_status',
      label: 'Verification',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'PENDING', label: 'Pending' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'VERIFIED', label: 'Verified' },
        { value: 'REJECTED', label: 'Rejected' }
      ],
      width: 130,
      render: (value: Persona['verification_status']) => formatVerificationStatus(value)
    },
    {
      id: 'created_at',
      label: 'Created',
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: 150,
      render: (value: string) => {
        const { absolute, relative } = formatDate(value);
        return (
          <div className="text-sm">
            <div className="text-gray-900">{relative}</div>
            <div className="text-gray-500 text-xs" title={absolute}>
              {new Date(value).toLocaleDateString()}
            </div>
          </div>
        );
      }
    },
    {
      id: 'updated_at',
      label: 'Updated',
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: 150,
      render: (value: string) => {
        const { relative } = formatDate(value);
        return (
          <div className="text-sm text-gray-600">
            {relative}
          </div>
        );
      }
    },
    {
      id: 'employment_status',
      label: 'Employment',
      sortable: true,
      filterable: true,
      width: 130,
      render: (value: string) => value || 'N/A'
    },
    {
      id: 'income_level',
      label: 'Income',
      sortable: true,
      filterable: true,
      filterType: 'range',
      width: 120,
      render: (value: number) => value ? `$${value.toLocaleString()}` : 'N/A'
    }
  ], []);

  const bulkActions = useMemo(() => [
    {
      id: 'flag-review',
      label: 'Flag for Review',
      icon: '⚠️',
      action: (selectedPersonas: Persona[]) => {
        // TODO: Implement bulk flag for review
        console.log('Flagging personas for review:', selectedPersonas.map(p => p.id));
      },
      disabled: (selectedPersonas: Persona[]) => selectedPersonas.some(p => p.user_id_review_needed)
    },
    {
      id: 'remove-flag',
      label: 'Remove Review Flag',
      icon: '✅',
      action: (selectedPersonas: Persona[]) => {
        // TODO: Implement bulk remove review flag
        console.log('Removing review flags:', selectedPersonas.map(p => p.id));
      },
      disabled: (selectedPersonas: Persona[]) => selectedPersonas.every(p => !p.user_id_review_needed)
    },
    {
      id: 'verify',
      label: 'Mark as Verified',
      icon: '🔒',
      action: (selectedPersonas: Persona[]) => {
        // TODO: Implement bulk verification
        console.log('Verifying personas:', selectedPersonas.map(p => p.id));
      },
      disabled: (selectedPersonas: Persona[]) => selectedPersonas.some(p => p.verification_status === 'VERIFIED')
    }
  ], []);

  return (
    <VirtualizedTable<Persona>
      data={personas}
      columns={columns}
      loading={loading}
      error={error}
      emptyMessage="No personas found"
      onRowClick={onPersonaClick}
      onRowSelect={onPersonaSelect}
      onExport={onExport}
      bulkActions={bulkActions}
      enableInlineEdit={enableInlineEdit}
      enableKeyboardNavigation={true}
      enableRowExpansion={true}
      rowHeight={72}
      overscan={10}
    />
  );
};

export default PersonaTable;