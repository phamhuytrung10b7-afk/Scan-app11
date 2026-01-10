import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Barcode } from 'lucide-react';
import { ScanInput } from './ScanInput';
import { StatusDisplay } from './StatusDisplay';
import { DashboardStats } from './DashboardStats';
import { ScanTable } from './ScanTable';
import { SettingsModal } from './SettingsModal';
import { ScanRecord, ScanStatus } from './types';
import { playSound } from './sound';
import { formatDateTime } from './format';
import { exportToCSV } from './csv';

export default function App() {
  // --- State ---
  const [targetModel, setTargetModel] = useState<string>('');
  const [scans, setScans] = useState<ScanRecord[]>([]);
  // Use a Set for O(1) duplicate checking of VALID codes only.
  const [scannedCodes, setScannedCodes] = useState<Set<string>>(new Set());
  
  const [lastScanStatus, setLastScanStatus] = useState<ScanStatus | 'idle'>('idle');
  const [lastScanCode, setLastScanCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load target model from localStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('proscan_target_model');
    if (savedModel) setTargetModel(savedModel);
  }, []);

  // --- Logic ---
  
  const handleScan = useCallback((code: string) => {
    // 1. Reset immediate state
    setLastScanCode(code);
    const now = new Date();
    
    // Helper function to add record to history
    const addRecord = (status: ScanStatus) => {
      const newRecord: ScanRecord = {
        id: scans.length + 1,
        code: code,
        targetModel: targetModel,
        timestamp: formatDateTime(now),
        rawTimestamp: now.getTime(),
        status: status
      };
      setScans(prev => [newRecord, ...prev]); // Add to top of list
    };

    // 2. Validate: Target Model Configured?
    if (!targetModel) {
      setLastScanStatus('idle');
      setStatusMessage('Vui lòng cấu hình Model trước khi quét!');
      playSound('error');
      setIsSettingsOpen(true);
      return;
    }

    // 3. Logic: Extract Model / Check Model
    if (!code.includes(targetModel)) {
      setLastScanStatus('wrong_model');
      setStatusMessage(`Mã không chứa model yêu cầu: "${targetModel}"`);
      playSound('error');
      addRecord('wrong_model'); // SAVE ERROR TO LIST
      return;
    }

    // 4. Logic: Duplicate Check
    // We check if this code has been successfully scanned before
    if (scannedCodes.has(code)) {
      setLastScanStatus('duplicate');
      setStatusMessage('Mã này đã được quét thành công trước đó!');
      playSound('error');
      addRecord('duplicate'); // SAVE ERROR TO LIST
      return;
    }

    // 5. Success
    setLastScanStatus('valid');
    setStatusMessage('');
    playSound('success');
    
    addRecord('valid');
    setScannedCodes(prev => new Set(prev).add(code)); // Only add VALID codes to the duplicate check set

  }, [targetModel, scannedCodes, scans.length]);

  const handleSaveSettings = (newModel: string) => {
    if (newModel.trim()) {
      setTargetModel(newModel.trim());
      localStorage.setItem('proscan_target_model', newModel.trim());
      // Reset status when model changes to clear old error states
      setLastScanStatus('idle');
      setStatusMessage('');
    }
  };

  const handleResetData = () => {
    setScans([]);
    setScannedCodes(new Set());
    setLastScanStatus('idle');
    setLastScanCode(null);
    setStatusMessage('Dữ liệu đã được đặt lại.');
  };

  const handleExport = () => {
    if (scans.length === 0) {
      alert('Không có dữ liệu để xuất.');
      return;
    }
    const timestamp = formatDateTime(new Date()).replace(/[: ]/g, '-');
    exportToCSV(scans, `ScanReport_${targetModel}_${timestamp}.csv`);
  };

  // --- Derived State ---
  const validCount = scans.filter(s => s.status === 'valid').length;
  const errorCount = scans.filter(s => s.status !== 'valid').length;

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Barcode className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold tracking-wider">PRO-SCAN <span className="text-blue-400">MFG</span></h1>
          </div>
          <div className="flex items-center space-x-4">
             {/* Clock or minimal info could go here */}
             <button 
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 rounded-full hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
               title="Cài đặt"
             >
               <Settings className="w-6 h-6" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Top Section: Input & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                 Khu Vực Quét Mã (Barcode Input)
               </label>
               <ScanInput onScan={handleScan} isDisabled={isSettingsOpen} />
               <p className="mt-3 text-xs text-gray-400 italic">
                 * Hệ thống tự động ghi nhận khi nhấn Enter hoặc máy quét gửi lệnh kết thúc.
               </p>
            </div>
            
            <DashboardStats 
              totalValid={validCount} 
              totalErrors={errorCount}
              targetModel={targetModel}
            />
          </div>

          <div>
             <StatusDisplay 
               lastScanStatus={lastScanStatus}
               lastScanCode={lastScanCode}
               message={statusMessage}
             />
          </div>
        </div>

        {/* Bottom Section: Data Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide flex items-center">
              Lịch Sử Quét (Toàn Bộ)
              <span className="ml-3 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Tổng: {scans.length}
              </span>
            </h2>
          </div>
          <ScanTable scans={scans} />
        </div>

      </main>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentModel={targetModel}
        onSave={handleSaveSettings}
        onResetData={handleResetData}
        onExport={handleExport}
      />
    </div>
  );
}