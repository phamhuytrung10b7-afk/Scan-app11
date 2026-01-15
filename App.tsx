import React, { useState, useCallback } from 'react';
import { FileSpreadsheet, Trash2, Smartphone, ShieldCheck } from 'lucide-react';
import { ImeiRecord, ScanStatus } from './types';
import { ScannerInput } from './components/ScannerInput';
import { HistoryList } from './components/HistoryList';
import { StatsCard } from './components/StatsCard';
import { generateExcel } from './utils/excelGenerator';
import { playSuccessSound, playErrorSound } from './utils/sound';

export default function App() {
  const [records, setRecords] = useState<ImeiRecord[]>([]);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleScan = useCallback((code: string) => {
    // 1. Check for duplicates
    const exists = records.some(r => r.code === code);
    
    if (exists) {
      setStatus('error');
      setErrorMessage(`Mã "${code}" đã tồn tại trong danh sách!`);
      playErrorSound();
      return;
    }

    // 2. Add new record
    const newRecord: ImeiRecord = {
      id: crypto.randomUUID(),
      code: code,
      timestamp: new Date()
    };

    setRecords(prev => [newRecord, ...prev]);
    setStatus('success');
    setErrorMessage(null);
    playSuccessSound();

    // Reset status back to idle after a short delay to allow for visual feedback
    setTimeout(() => {
        setStatus(prev => prev === 'success' ? 'idle' : prev);
    }, 1500);

  }, [records]);

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách?')) {
      setRecords([]);
      setStatus('idle');
      setErrorMessage(null);
    }
  };

  const handleExport = () => {
    if (records.length === 0) {
      alert('Danh sách trống, không thể xuất file.');
      return;
    }
    generateExcel(records);
  };

  const clearError = () => {
      setStatus('idle');
      setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Smartphone className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              IMEI Scanner Pro
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <ShieldCheck className="w-3 h-3" />
            <span>Sẵn sàng</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Input Section */}
        <section aria-label="Scanner Input">
          <ScannerInput 
            onScan={handleScan} 
            status={status} 
            errorMessage={errorMessage}
            onClearError={clearError}
          />
        </section>

        {/* Stats & Actions */}
        <section className="grid grid-cols-2 gap-4">
            <StatsCard count={records.length} />
            <div className="flex flex-col gap-2 justify-center">
                 <button 
                    onClick={handleExport}
                    disabled={records.length === 0}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Xuất Excel
                </button>
                <button 
                    onClick={handleClearAll}
                    disabled={records.length === 0}
                    className="flex-1 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm h-10"
                >
                    <Trash2 className="w-4 h-4" />
                    Xóa tất cả
                </button>
            </div>
        </section>

        {/* List Section */}
        <section>
          <HistoryList records={records} onDelete={handleDelete} />
        </section>

      </main>
    </div>
  );
}
