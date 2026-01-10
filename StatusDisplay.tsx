import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { ScanStatus } from './types';

interface StatusDisplayProps {
  lastScanStatus: ScanStatus | 'idle';
  lastScanCode: string | null;
  message?: string;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ lastScanStatus, lastScanCode, message }) => {
  let bgColor = 'bg-gray-100';
  let borderColor = 'border-gray-300';
  let textColor = 'text-gray-500';
  let Icon = Activity;
  let mainText = 'SẴN SÀNG QUÉT';

  if (lastScanStatus === 'valid') {
    bgColor = 'bg-green-100';
    borderColor = 'border-green-500';
    textColor = 'text-green-700';
    Icon = CheckCircle;
    mainText = 'HỢP LỆ (OK)';
  } else if (lastScanStatus === 'duplicate') {
    bgColor = 'bg-orange-100';
    borderColor = 'border-orange-500';
    textColor = 'text-orange-700';
    Icon = AlertTriangle;
    mainText = 'LỖI: MÃ TRÙNG';
  } else if (lastScanStatus === 'wrong_model') {
    bgColor = 'bg-red-100';
    borderColor = 'border-red-500';
    textColor = 'text-red-700';
    Icon = XCircle;
    mainText = 'LỖI: SAI MODEL';
  }

  return (
    <div className={`flex flex-col items-center justify-center w-full p-6 border-4 rounded-xl shadow-sm transition-colors duration-200 ${bgColor} ${borderColor} h-48`}>
      <Icon className={`w-16 h-16 mb-2 ${textColor}`} />
      <h2 className={`text-3xl font-black uppercase ${textColor} tracking-wide`}>{mainText}</h2>
      {lastScanCode && (
         <div className="mt-2 text-lg font-mono font-medium text-gray-700 bg-white/50 px-4 py-1 rounded">
            {lastScanCode}
         </div>
      )}
      {message && (
        <p className={`mt-1 font-semibold ${textColor}`}>{message}</p>
      )}
    </div>
  );
};
