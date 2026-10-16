import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'purple';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  children,
  className,
  dot = false,
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  const dotColors = {
    emerald: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    cyan: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
    amber: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    rose: 'bg-rose-400 shadow-[0_0_8px_#fb7185]',
    purple: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
    slate: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
};
