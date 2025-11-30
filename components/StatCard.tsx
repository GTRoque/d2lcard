import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon }) => {
  return (
    <div className="group relative p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-zinc-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-zinc-400 group-hover:text-zinc-600 transition-colors">{icon}</div>}
      </div>
      <div className="text-3xl font-light text-zinc-900 mb-1 tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-zinc-400 group-hover:text-zinc-500 transition-colors">
          {subtitle}
        </p>
      )}
      
      {/* Decorative gradient line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-200 to-transparent opacity-50"></div>
    </div>
  );
};