import React from 'react';
import { ScanRecord } from './types';

interface ScanTableProps {
  scans: ScanRecord[];
}

export const ScanTable: React.FC<ScanTableProps> = ({ scans }) => {
  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="overflow-y-auto max-h-[400px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">STT</th>
              <th scope="col" className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Mã Scan</th>
              <th scope="col" className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Model</th>
              <th scope="col" className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Thời Gian</th>
              <th scope="col" className="px-6 py-3 text-xs font-bold tracking-wider text-left text-gray-500 uppercase">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                  Chưa có dữ liệu scan
                </td>
              </tr>
            ) : (
              scans.map((scan, index) => {
                // Determine order number (descending or ascending). Usually logs show newest top.
                // But STT usually implies count up. Let's use the ID for STT.
                
                let statusBadge;
                if (scan.status === 'valid') {
                  statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Hợp lệ</span>;
                } else if (scan.status === 'duplicate') {
                  statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Trùng mã</span>;
                } else {
                  statusBadge = <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Sai model</span>;
                }

                return (
                  <tr key={scan.id} className={index === 0 ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{scan.id}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900 whitespace-nowrap">{scan.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{scan.targetModel}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{scan.timestamp}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">{statusBadge}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
