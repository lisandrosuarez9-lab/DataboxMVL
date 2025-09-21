import React from 'react';
import { Card, Skeleton } from '@/components/ui';
import { PersonaFlag } from '@/types';

interface PersonaFlagsTableProps {
  flags: PersonaFlag[];
  loading?: boolean;
}

const PersonaFlagsTable: React.FC<PersonaFlagsTableProps> = ({ 
  flags, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Card title="Persona Flags" subtitle="Recent flag updates">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Persona Flags" 
      subtitle={`${flags.length} flags found`}
      className="h-full"
    >
      <div className="overflow-hidden">
        {flags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-4 block">📋</span>
            <p>No persona flags found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {flag.persona_id}
                    </span>
                    <span className="text-sm text-gray-500">
                      • {flag.flag_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {flag.flag_value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Updated: {new Date(flag.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {flag.flag_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default PersonaFlagsTable;