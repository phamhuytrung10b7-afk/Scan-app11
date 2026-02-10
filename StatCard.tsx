
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  type: 'neutral' | 'success' | 'danger' | 'warning';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, type, icon }) => {
  const styles = {
    neutral: "border-gray-300 text-gray-700 bg-white",
    success: "border-green-400 text-green-600 bg-green-50/30",
    danger: "border-red-300 text-red-600 bg-red-50/30",
    warning: "border-amber-300 text-amber-600 bg-amber-50/30",
  };

  const titleColors = {
    neutral: "text-gray-500",
    success: "text-green-600",
    danger: "text-red-500",
    warning: "text-amber-600",
  };

  return (
    <div className={`p-4 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center h-32 relative overflow-hidden ${styles[type]}`}>
      <div className="flex justify-between items-center w-full absolute top-3 px-4">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${titleColors[type]}`}>{title}</h3>
        {icon && <div className="opacity-80 scale-90">{icon}</div>}
      </div>
      <div className="text-5xl font-bold mt-4 tracking-wide">
        {value}
      </div>
    </div>
  );
};
