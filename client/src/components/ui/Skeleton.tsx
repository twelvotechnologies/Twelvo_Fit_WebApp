import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-slate-800/60 animate-pulse rounded-lg border border-white/5',
        className
      )}
      {...props}
    />
  );
};
