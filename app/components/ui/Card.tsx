import React from 'react';
import { cn } from '@/app/lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className, children }) => {
  return (
    <div className={cn('bg-slate-900 border border-slate-800 rounded-xl shadow-lg', className)}>
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardProps> = ({ className, children }) => {
  return (
    <div className={cn('p-6 pb-4', className)}>
      {children}
    </div>
  );
};

const CardContent: React.FC<CardProps> = ({ className, children }) => {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  );
};

const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className, 
  children 
}) => {
  return (
    <h3 className={cn('text-lg font-semibold text-white', className)}>
      {children}
    </h3>
  );
};

export { Card, CardHeader, CardContent, CardTitle };