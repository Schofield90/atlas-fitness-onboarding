import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface QuickStatProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, change, trend }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };
  
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-white opacity-70">{label}</p>
        {getTrendIcon()}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      <p className={`text-xs mt-1 ${getTrendColor()}`}>
        {change}
      </p>
    </div>
  );
};

export default QuickStat;