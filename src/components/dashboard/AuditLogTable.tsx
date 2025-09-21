import React from 'react';
import { Card, Skeleton } from '@/components/ui';
import { AuditEntry } from '@/types';

interface AuditLogTableProps {
  entries: AuditEntry[];
  loading?: boolean;
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ 
  entries, 
  loading = false 
}) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card title="Audit Log" subtitle="Recent audit entries">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
              <Skeleton className="h-8 w-16 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Audit Log" 
      subtitle={`${entries.length} audit entries`}
      className="h-full"
    >
      <div className="overflow-hidden">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-4 block">📜</span>
            <p>No audit entries found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.audit_id}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(entry.action_type)}`}
                >
                  {entry.action_type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 truncate">
                      Persona: {entry.persona_id}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <div className="grid grid-cols-2 gap-2">
                      {entry.old_value && (
                        <div>
                          <span className="font-medium">Old:</span> {entry.old_value}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">New:</span> {entry.new_value}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>By: {entry.changed_by}</span>
                    <span>{new Date(entry.changed_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AuditLogTable;