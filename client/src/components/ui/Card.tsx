import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 shadow-card transition-all duration-200',
        hoverable && 'glass-card-hover hover:border-white/15 hover:shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
