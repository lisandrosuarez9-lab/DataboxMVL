import React from 'react';
import { Card, Skeleton } from '@/components/ui';
import { DashboardMetrics } from '@/types';
import { clsx } from 'clsx';

interface MetricsCardProps {
  metrics: DashboardMetrics | null;
  loading?: boolean;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics, loading = false }) => {
  const metricItems = [
    {
      title: 'Total Personas',
      value: metrics?.totalPersonas || 0,
      icon: '👥',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Review Needed',
      value: metrics?.reviewNeeded || 0,
      icon: '⚠️',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Audit Entries',
      value: metrics?.auditEntries || 0,
      icon: '📋',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} compact>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metricItems.map((item) => (
        <Card key={item.title} compact className="hover:scale-105 transition-transform duration-200">
          <div className="flex items-center space-x-4">
            <div className={clsx('p-3 rounded-lg', item.bgColor)}>
              <span className="text-2xl">{item.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{item.title}</p>
              <p className={clsx('text-2xl font-bold', item.color)}>
                {item.value.toLocaleString()}
              </p>
              {metrics?.lastUpdated && (
                <p className="text-xs text-gray-500 mt-1">
                  Updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MetricsCard;