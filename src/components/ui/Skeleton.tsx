import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  height = 'h-4',
  width = 'w-full',
  rounded = true,
}) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-200',
        height,
        width,
        rounded && 'rounded',
        className
      )}
    />
  );
};

export default Skeleton;