import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Trash2, 
  Smartphone, 
  ShieldCheck, 
  Layers, 
  Scan, 
  XCircle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- TYPES ---
interface ImeiRecord {
  id: string;
  code: string;
  timestamp: Date;
}

type ScanStatus = 'idle' | 'success' | 'error';

// --- UTILS: SOUND ---
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

const playSuccessSound = () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // High pitch
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
  oscillator.stop(audioContext.currentTime + 0.1);
};

const playErrorSound = () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(150, audioContext.currentTime); // Low pitch
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
  oscillator.stop(audioContext.currentTime + 0.3);
};

// --- UTILS: EXCEL ---
const generateExcel = (records: ImeiRecord[]) => {
  // Format data for Excel
  const data = records.map((record, index) => ({
    'STT': records.length - index,
    'Mã IMEI': record.code,
    'Thời gian quét': record.timestamp.toLocaleString('vi-VN')
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const wscols = [
    { wch: 10 }, // STT
    { wch: 25 }, // IMEI
    { wch: 25 }  // Time
  ];
  worksheet['!cols'] = wscols;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh Sách IMEI");

  // Generate file
  const dateStr = new Date().toISOString().slice(0,10);
  XLSX.writeFile(workbook, `IMEI_List_${dateStr}.xlsx`);
};

// --- COMPONENTS ---

const StatsCard: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">Tổng số lượng</p>
        <h3 className="text-2xl font-bold text-slate-800">{count}</h3>
      </div>
      <div className="p-3 bg-blue-50 rounded-lg">
        <Layers className="w-6 h-6 text-blue-600" />
      </div>
    </div>
  );
};

const ScannerInput: React.FC<{
  onScan: (code: string) => void;
  status: ScanStatus;
  errorMessage?: string | null;
  onClearError: () => void;
}> = ({ onScan, status, errorMessage, onClearError }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInput = () => {
      setTimeout(() => inputRef.current?.focus(), 10);
    };
    focusInput();
  }, [status]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputValue.trim()) {
        onScan(inputValue.trim());
        setInputValue('');
      }
    } else {
        if (status === 'error') {
            onClearError();
        }
    }
  };

  const borderColor = 
    status === 'error' ? 'border-red-500 focus:ring-red-200' : 
    status === 'success' ? 'border-green-500 focus:ring-green-200' : 
    'border-slate-300 focus:ring-blue-200';

  const iconColor = 
    status === 'error' ? 'text-red-500' : 
    status === 'success' ? 'text-green-500' : 
    'text-slate-400';

  return (
    <div className="w-full">
      <div className="relative group">
        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${iconColor}`}>
           {status === 'error' ? <XCircle className="w-6 h-6" /> : 
            status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
            <Scan className="w-6 h-6" />}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          className={`block w-full pl-12 pr-4 py-4 text-lg font-mono bg-white border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm ${borderColor}`}
          placeholder="Quét mã hoặc nhập tay..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
        />
        
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-1 bg-slate-50">
                Enter ↵
            </span>
        </div>
      </div>

      <div className={`mt-2 h-6 text-sm font-medium transition-opacity duration-300 ${status !== 'idle' ? 'opacity-100' : 'opacity-0'}`}>
        {status === 'error' && (
           <span className="text-red-600 flex items-center gap-2">
             <span>⚠️</span> {errorMessage || 'Lỗi không xác định'}
           </span>
        )}
        {status === 'success' && (
            <span className="text-green-600">
                Đã thêm thành công
            </span>
        )}
      </div>
    </div>
  );
};

const HistoryList: React.FC<{
  records: ImeiRecord[];
  onDelete: (id: string) => void;
}> = ({ records, onDelete }) => {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
        <FileText className="w-12 h-12 mb-3 opacity-50" />
        <p>Chưa có dữ liệu. Hãy quét mã đầu tiên!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Lịch sử quét</h3>
            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                Gần nhất trước
            </span>
        </div>
      <div className="max-h-[500px] overflow-y-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">STT</th>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã IMEI</th>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Giờ</th>
              <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record, index) => (
              <tr key={record.id} className="hover:bg-blue-50/50 transition-colors group animate-in fade-in duration-300">
                <td className="py-3 px-6 text-slate-500 font-medium text-sm">
                  {records.length - index}
                </td>
                <td className="py-3 px-6">
                  <span className="font-mono text-slate-700 font-medium tracking-wide">
                    {record.code}
                  </span>
                </td>
                <td className="py-3 px-6 text-slate-400 text-sm">
                  {record.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="py-3 px-6 text-center">
                  <button
                    onClick={() => onDelete(record.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Xóa dòng này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- MAIN APP ---
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

    // Reset status back to idle after a short delay
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