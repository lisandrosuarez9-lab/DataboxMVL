import React from 'react';
import { clsx } from 'clsx';
import { CardProps } from '@/types';

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  compact = false,
  className,
  ...props
}) => {
  const baseClasses = compact 
    ? 'bg-white rounded-lg shadow-soft p-4 transition-shadow duration-200 hover:shadow-medium'
    : 'bg-white rounded-xl shadow-soft p-6 transition-shadow duration-200 hover:shadow-medium';

  return (
    <div className={clsx(baseClasses, className)} {...props}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;