import React from 'react';

interface DashboardStatsProps {
  totalValid: number;
  totalErrors: number;
  targetModel: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ totalValid, totalErrors, targetModel }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow border border-blue-100 flex flex-col items-center justify-center">
        <span className="text-gray-500 font-medium uppercase text-xs tracking-wider">Model Đang Chạy</span>
        <span className="text-2xl md:text-3xl font-bold text-blue-600 truncate max-w-full px-2">
          {targetModel || <span className="text-gray-300 italic">Chưa chọn</span>}
        </span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-green-100 flex flex-col items-center justify-center">
        <span className="text-gray-500 font-medium uppercase text-xs tracking-wider">Số Lượng OK</span>
        <span className="text-4xl font-bold text-green-600">{totalValid}</span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-red-100 flex flex-col items-center justify-center">
        <span className="text-gray-500 font-medium uppercase text-xs tracking-wider">Số Lượng Lỗi</span>
        <span className="text-4xl font-bold text-red-500">{totalErrors}</span>
      </div>
    </div>
  );
};
