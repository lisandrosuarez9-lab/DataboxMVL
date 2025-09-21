import React, { useMemo } from 'react';
import { Card } from '@/components/ui';
import { ChartDataPoint } from '@/types';
import { clsx } from 'clsx';

interface KPICardProps {
  title: string;
  value: number | string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  sparklineData?: ChartDataPoint[];
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  target?: number;
  onClick?: () => void;
  loading?: boolean;
  metadata?: {
    label: string;
    value: string | number;
  }[];
  actions?: Array<{
    label: string;
    icon?: string;
    onClick: () => void;
  }>;
}

const Sparkline: React.FC<{ data: ChartDataPoint[]; color: string; height?: number }> = ({ 
  data, 
  color,
  height = 32 
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 120; // Width of 120px
    const y = height - ((point.value - minValue) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex items-center">
      <svg width="120" height={height} className="text-gray-400">
        <polyline
          fill="none"
          stroke={`var(--color-${color}-500)`}
          strokeWidth="2"
          points={points}
          className="opacity-80"
        />
        {/* Fill area under the line */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={`var(--color-${color}-500)`} stopOpacity="0.3" />
            <stop offset="100%" stopColor={`var(--color-${color}-500)`} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon
          fill={`url(#gradient-${color})`}
          points={`0,${height} ${points} 120,${height}`}
        />
      </svg>
    </div>
  );
};

const TrendIndicator: React.FC<{ trend: KPICardProps['trend'] }> = ({ trend }) => {
  if (!trend) return null;

  const { value, direction, period } = trend;
  const isPositive = direction === 'up';
  const isNegative = direction === 'down';

  return (
    <div className={clsx(
      'flex items-center text-sm',
      isPositive && 'text-green-600',
      isNegative && 'text-red-600',
      direction === 'neutral' && 'text-gray-500'
    )}>
      {direction !== 'neutral' && (
        <span className="mr-1">
          {isPositive ? '↗' : '↘'}
        </span>
      )}
      <span className="font-medium">
        {Math.abs(value)}%
      </span>
      <span className="ml-1 text-gray-500">{period}</span>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; target: number; color: string }> = ({ 
  value, 
  target, 
  color 
}) => {
  const percentage = Math.min((value / target) * 100, 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
      <div
        className={clsx(
          'h-2 rounded-full transition-all duration-300',
          `bg-${color}-500`
        )}
        style={{ width: `${percentage}%` }}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{value.toLocaleString()}</span>
        <span>Target: {target.toLocaleString()}</span>
      </div>
    </div>
  );
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  sparklineData,
  icon,
  color = 'blue',
  target,
  onClick,
  loading = false,
  metadata,
  actions
}) => {
  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return value;
  }, [value]);

  if (loading) {
    return (
      <Card className="p-6 min-h-[140px]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={clsx(
        "p-6 min-h-[140px] transition-all duration-200 hover:shadow-lg",
        onClick && "cursor-pointer hover:scale-105"
      )}
      onClick={onClick}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 truncate">{title}</h3>
          {icon && (
            <div className={clsx(
              'flex items-center justify-center w-10 h-10 rounded-lg',
              `bg-${color}-50 text-${color}-600`
            )}>
              <span className="text-lg">{icon}</span>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="flex items-baseline space-x-2">
          <span className={clsx(
            'text-3xl font-bold',
            `text-${color}-600`
          )}>
            {formattedValue}
          </span>
          <TrendIndicator trend={trend} />
        </div>

        {/* Progress Bar (if target is provided) */}
        {target && typeof value === 'number' && (
          <ProgressBar value={value} target={target} color={color} />
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="flex justify-end">
            <Sparkline data={sparklineData} color={color} />
          </div>
        )}

        {/* Metadata */}
        {metadata && metadata.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            {metadata.map((item, index) => (
              <div key={index} className="text-xs">
                <div className="text-gray-500">{item.label}</div>
                <div className="font-medium text-gray-900">{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex space-x-2 pt-2 border-t border-gray-100">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className="text-xs text-gray-600 hover:text-gray-800 transition-colors flex items-center"
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// Specific KPI Components

interface TotalPersonasKPIProps {
  totalPersonas: number;
  loading?: boolean;
  growthRate?: number;
  sparklineData?: ChartDataPoint[];
  onViewDetails?: () => void;
}

export const TotalPersonasKPI: React.FC<TotalPersonasKPIProps> = ({
  totalPersonas,
  loading,
  growthRate,
  sparklineData,
  onViewDetails
}) => (
  <KPICard
    title="Total Personas"
    value={totalPersonas}
    icon="👥"
    color="blue"
    trend={growthRate !== undefined ? {
      value: growthRate,
      direction: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'neutral',
      period: '7d'
    } : undefined}
    sparklineData={sparklineData}
    loading={loading}
    onClick={onViewDetails}
    metadata={[
      { label: 'Active', value: Math.floor(totalPersonas * 0.85) },
      { label: 'Inactive', value: Math.floor(totalPersonas * 0.15) }
    ]}
    actions={[
      {
        label: 'View All',
        icon: '👁️',
        onClick: () => onViewDetails?.()
      }
    ]}
  />
);

interface FlaggedPersonasKPIProps {
  reviewNeeded: number;
  totalPersonas: number;
  loading?: boolean;
  sparklineData?: ChartDataPoint[];
  onViewFlagged?: () => void;
}

export const FlaggedPersonasKPI: React.FC<FlaggedPersonasKPIProps> = ({
  reviewNeeded,
  totalPersonas,
  loading,
  sparklineData,
  onViewFlagged
}) => {
  const percentage = totalPersonas > 0 ? (reviewNeeded / totalPersonas) * 100 : 0;
  
  return (
    <KPICard
      title="Flagged Personas"
      value={reviewNeeded}
      icon="⚠️"
      color="amber"
      sparklineData={sparklineData}
      loading={loading}
      onClick={onViewFlagged}
      metadata={[
        { label: 'Percentage', value: `${percentage.toFixed(1)}%` },
        { label: 'Priority', value: Math.floor(reviewNeeded * 0.3) }
      ]}
      actions={[
        {
          label: 'Review Now',
          icon: '🔍',
          onClick: () => onViewFlagged?.()
        }
      ]}
    />
  );
};

interface AuditActivityKPIProps {
  auditEntries: number;
  loading?: boolean;
  dailyAverage?: number;
  sparklineData?: ChartDataPoint[];
  onViewAudit?: () => void;
}

export const AuditActivityKPI: React.FC<AuditActivityKPIProps> = ({
  auditEntries,
  loading,
  dailyAverage,
  sparklineData,
  onViewAudit
}) => (
  <KPICard
    title="Audit Activity"
    value={auditEntries}
    icon="📋"
    color="green"
    sparklineData={sparklineData}
    loading={loading}
    onClick={onViewAudit}
    metadata={[
      { label: 'Daily Avg', value: dailyAverage ? Math.round(dailyAverage) : 'N/A' },
      { label: 'Last 24h', value: Math.floor(auditEntries * 0.1) }
    ]}
    actions={[
      {
        label: 'View Log',
        icon: '📊',
        onClick: () => onViewAudit?.()
      }
    ]}
  />
);

export default KPICard;