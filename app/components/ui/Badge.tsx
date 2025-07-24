import React from 'react';
import { cn } from '@/app/lib/utils';

interface BadgeProps {
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'default', 
  children 
}) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium';
  
  const variants = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-green-900/50 text-green-400 border border-green-800',
    warning: 'bg-amber-900/50 text-amber-400 border border-amber-800',
    error: 'bg-red-900/50 text-red-400 border border-red-800',
    info: 'bg-blue-900/50 text-blue-400 border border-blue-800'
  };
  
  return (
    <span className={cn(baseClasses, variants[variant], className)}>
      {children}
    </span>
  );
};

export default Badge;