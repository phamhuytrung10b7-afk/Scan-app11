
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, ScanLine, Users, CheckCircle, RefreshCw, Box, Settings, Layers, Edit, XCircle, Activity, List, Tag, Maximize, Minimize, AlertCircle, ChevronRight, PenTool, AlertTriangle, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { utils, writeFile } from 'xlsx';

import { ScanRecord, ErrorState, DEFAULT_PROCESS_STAGES, Stage } from './types';
import { Button } from './Button';
import { ErrorModal } from './ErrorModal';
import { StatCard } from './StatCard';
import { StageSettingsModal } from './StageSettingsModal';

export default function App() {
  // --- STATE WITH ROBUST PERSISTENCE ---
  
  // 1. Configuration (Stages) - Never lost on simple reset
  const [stages, setStages] = useState<Stage[]>(() => {
    try {
      const saved = localStorage.getItem('proscan_stages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            if (parsed.length === 1) {
                return [parsed[0], DEFAULT_PROCESS_STAGES[1]];
            }
            return parsed.map((s: any) => ({
              ...s,
              additionalFieldLabels: s.additionalFieldLabels ? [...s.additionalFieldLabels, ...Array(8).fill("")].slice(0, 8) : Array(8).fill(""),
              additionalFieldDefaults: s.additionalFieldDefaults ? [...s.additionalFieldDefaults, ...Array(8).fill("")].slice(0, 8) : Array(8).fill(""),
              additionalFieldValidationLists: s.additionalFieldValidationLists ? [...s.additionalFieldValidationLists, ...Array(8).fill("")].slice(0, 8) : Array(8).fill(""),
              additionalFieldMins: s.additionalFieldMins ? [...s.additionalFieldMins, ...Array(8).fill("")].slice(0, 8) : Array(8).fill(""),
              additionalFieldMaxs: s.additionalFieldMaxs ? [...s.additionalFieldMaxs, ...Array(8).fill("")].slice(0, 8) : Array(8).fill(""),
              validationRules: s.validationRules || [],
              statusLabels: s.statusLabels || { valid: "OK/ĐÃ SỬA", defect: "NG/TRẢ LẠI", error: "LỖI HỆ THỐNG" }
            }));
        }
      }
    } catch (e) {
      console.error("Failed to load stages from storage", e);
    }
    return DEFAULT_PROCESS_STAGES;
  });

  // 2. Employees - Persist per session/reset
  const [stageEmployees, setStageEmployees] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('proscan_employees');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  // 3. Model Info & List
  const [availableModels, setAvailableModels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('proscan_available_models');
      return saved ? JSON.parse(saved) : ["IPHONE 13", "IPHONE 14", "SAMSUNG S23"];
    } catch (e) { return ["IPHONE 13", "IPHONE 14", "SAMSUNG S23"]; }
  });

  const [modelName, setModelName] = useState<string>(() => {
    return localStorage.getItem('proscan_model_name') || '';
  });
  
  // 4. App State
  const [currentStage, setCurrentStage] = useState<number>(() => {
    const saved = localStorage.getItem('proscan_active_stage');
    return saved ? parseInt(saved) : 1;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 5. DATA (History & Progress)
  const [history, setHistory] = useState<ScanRecord[]>(() => {
    try {
      const saved = localStorage.getItem('proscan_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [productProgress, setProductProgress] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('proscan_progress');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  const [productStatus, setProductStatus] = useState<Record<string, 'valid' | 'defect'>>(() => {
    try {
      const saved = localStorage.getItem('proscan_status');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });
  
  // Inputs
  const [employeeInput, setEmployeeInput] = useState('');
  const [measurementValue, setMeasurementValue] = useState(''); 
  const [productInput, setProductInput] = useState('');
  const [additionalValues, setAdditionalValues] = useState<string[]>(Array(8).fill(""));
  const [errorModal, setErrorModal] = useState<ErrorState>({ isOpen: false, message: '' });

  // Refs
  const employeeInputRef = useRef<HTMLInputElement>(null);
  const measurementInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const extraInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Calculate stats for CURRENT stage
  const validScanCount = history.filter(r => r.status === 'valid' && r.stage === currentStage).length;
  const errorScanCount = history.filter(r => r.status === 'error' && r.stage === currentStage).length;

  // Calculate pending inventory for stages > 1
  const pendingCount = useMemo(() => {
    if (currentStage === 1) return 0;
    return Object.values(productProgress).filter(p => p === (currentStage - 1)).length;
  }, [productProgress, currentStage]);

  // --- IMMEDIATE PERSISTENCE EFFECTS (Save on Change) ---
  useEffect(() => { localStorage.setItem('proscan_stages', JSON.stringify(stages)); }, [stages]);
  useEffect(() => { localStorage.setItem('proscan_employees', JSON.stringify(stageEmployees)); }, [stageEmployees]);
  useEffect(() => { localStorage.setItem('proscan_available_models', JSON.stringify(availableModels)); }, [availableModels]);
  useEffect(() => { localStorage.setItem('proscan_model_name', modelName); }, [modelName]);
  useEffect(() => { localStorage.setItem('proscan_active_stage', currentStage.toString()); }, [currentStage]);
  
  // Heavy data saving
  useEffect(() => { localStorage.setItem('proscan_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('proscan_progress', JSON.stringify(productProgress)); }, [productProgress]);
  useEffect(() => { localStorage.setItem('proscan_status', JSON.stringify(productStatus)); }, [productStatus]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- HELPER: Get Current Stage Object & Employee ---
  const currentStageObj = useMemo(() => stages.find(s => s.id === currentStage) || stages[0], [stages, currentStage]);
  const currentEmployeeId = stageEmployees[currentStage];
  
  const activeExtraFields = useMemo(() => {
    if (!currentStageObj?.additionalFieldLabels) return [];
    return currentStageObj.additionalFieldLabels.map((label, idx) => ({ label, idx })).filter(f => f.label.trim() !== "");
  }, [currentStageObj]);

  const loadDefaults = useCallback(() => {
    if (currentStageObj?.additionalFieldDefaults) {
      const defaults = [...currentStageObj.additionalFieldDefaults];
      while(defaults.length < 8) defaults.push("");
      setAdditionalValues(defaults);
    } else {
      setAdditionalValues(Array(8).fill(""));
    }
  }, [currentStageObj]);

  useEffect(() => {
    loadDefaults();
  }, [currentStage, loadDefaults]);

  // --- INITIAL FOCUS ---
  useEffect(() => {
    if (!currentEmployeeId) employeeInputRef.current?.focus();
    else {
      if (currentStageObj?.enableMeasurement) measurementInputRef.current?.focus();
      else if (activeExtraFields.length > 0) extraInputRefs.current[activeExtraFields[0].idx]?.focus();
      else productInputRef.current?.focus();
    }
  }, [currentStage, currentEmployeeId]);

  // --- HANDLERS ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleModelSelect = (model: string) => {
    setModelName(model);
    // Auto focus employee input if not set, or product input if set
    setTimeout(() => {
        if (!currentEmployeeId) employeeInputRef.current?.focus();
        else productInputRef.current?.focus();
    }, 50);
  };

  const handleEmployeeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = employeeInput.trim();
      if (val) {
        setStageEmployees(prev => ({ ...prev, [currentStage]: val }));
        setEmployeeInput('');
        setTimeout(() => {
             if (currentStageObj?.enableMeasurement) measurementInputRef.current?.focus();
             else if (activeExtraFields.length > 0) extraInputRefs.current[activeExtraFields[0].idx]?.focus();
             else productInputRef.current?.focus();
        }, 50);
      }
    }
  };

  const handleMeasurementScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (measurementValue.trim()) {
        const nextField = activeExtraFields.find(f => !additionalValues[f.idx]);
        if (nextField) {
           extraInputRefs.current[nextField.idx]?.focus();
        } else if (activeExtraFields.length > 0) {
           const hasManualFields = activeExtraFields.some(f => !currentStageObj?.additionalFieldDefaults?.[f.idx]);
           if (hasManualFields) {
                const first = activeExtraFields[0];
                extraInputRefs.current[first.idx]?.focus();
           } else {
             productInputRef.current?.focus();
           }
        } else {
           productInputRef.current?.focus();
        }
      }
    }
  };

  const handleExtraInputScan = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      const currentActivePos = activeExtraFields.findIndex(f => f.idx === index);
      
      if (currentActivePos !== -1 && currentActivePos < activeExtraFields.length - 1) {
         let nextActivePos = currentActivePos + 1;
         let nextRealIdx = activeExtraFields[nextActivePos].idx;

         if (nextActivePos < activeExtraFields.length) {
            nextRealIdx = activeExtraFields[nextActivePos].idx;
            extraInputRefs.current[nextRealIdx]?.focus();
         } else {
            productInputRef.current?.focus();
         }
      } else {
         productInputRef.current?.focus();
      }
    }
  };

  const updateAdditionalValue = (index: number, value: string) => {
    const newValues = [...additionalValues];
    newValues[index] = value;
    setAdditionalValues(newValues);
  };

  const handleError = (message: string, scannedCode: string = '') => {
    const errorRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: scannedCode || '---',
      model: localStorage.getItem('proscan_current_model') || 'CHƯA CÓ',
      modelName: modelName || '',
      employeeId: currentEmployeeId || 'CHƯA CÓ',
      timestamp: new Date().toISOString(),
      status: 'error',
      note: message,
      stage: currentStage
    };
    setHistory(prev => [errorRecord, ...prev]);
    setErrorModal({ isOpen: true, message });
  };

  const handleSuccess = (code: string) => {
    setProductProgress(prev => ({ ...prev, [code]: currentStage }));
    setProductStatus(prev => ({ ...prev, [code]: 'valid' }));

    const newRecord: ScanRecord = {
      id: crypto.randomUUID(),
      stt: history.length + 1,
      productCode: code,
      model: localStorage.getItem('proscan_current_model') || '',
      modelName: modelName,
      employeeId: currentEmployeeId || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      status: 'valid',
      note: 'Thành công',
      stage: currentStage,
      measurement: currentStageObj?.enableMeasurement ? measurementValue : undefined,
      additionalValues: [...additionalValues]
    };

    setHistory(prev => [newRecord, ...prev]);
    
    // Clear inputs
    setProductInput('');
    setMeasurementValue(''); 
    loadDefaults();
    
    // Smart Focus Recovery
    setTimeout(() => {
        if (currentStageObj?.enableMeasurement) measurementInputRef.current?.focus();
        else if (activeExtraFields.length > 0) extraInputRefs.current[activeExtraFields[0].idx]?.focus();
        else productInputRef.current?.focus();
    }, 50);
  };

  const handleProductScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = productInput.trim();
      if (!code) return;

      // --- VALIDATIONS ---
      if (!modelName.trim()) return handleError("Lỗi: Chưa chọn Tên Model (Click nút phía trên).", code);
      if (!currentEmployeeId) return handleError(`Lỗi: Chưa xác định nhân viên cho công đoạn này.`, code);

      // --- SEQUENCE CHECK ---
      if (currentStage > 1) {
         const previousStageDone = (productProgress[code] || 0) >= (currentStage - 1);
         if (!previousStageDone) {
             const prevStageName = stages.find(s => s.id === currentStage - 1)?.name || `Công đoạn ${currentStage - 1}`;
             return handleError(`Lỗi quy trình: Mã này chưa hoàn thành "${prevStageName}".`, code);
         }
      }

      // MEASUREMENT VALIDATION
      if (currentStageObj?.enableMeasurement) {
        const val = measurementValue.trim();
        if (!val) {
           measurementInputRef.current?.focus();
           return handleError(`Lỗi: Công đoạn này yêu cầu nhập ${currentStageObj.measurementLabel || 'giá trị đo'}.`, code);
        }

        const standard = currentStageObj.measurementStandard?.trim();
        if (standard) {
          const stdNum = parseFloat(standard.replace(',', '.'));
          const valNum = parseFloat(val.replace(',', '.'));

          if (!isNaN(stdNum)) {
             if (isNaN(valNum)) return handleError(`Lỗi: Tiêu chuẩn là số (${standard}), vui lòng nhập kết quả là số.`, code);
             if (valNum >= stdNum) return handleError(`LỖI NG: Kết quả đo quá cao!\nTiêu chuẩn (Max): < ${standard}\nThực tế: ${val}`, code);
          } else {
             if (val.toUpperCase() !== standard.toUpperCase()) return handleError(`LỖI NG: Kết quả đo không đạt chuẩn!\nTiêu chuẩn: ${standard}\nThực tế: ${val}`, code);
          }
        }
      }
      
      // VALIDATE EXTRA FIELDS
      for (const field of activeExtraFields) {
           const fieldVal = additionalValues[field.idx].trim();
           if (!fieldVal && field.idx === activeExtraFields[0].idx) {
             extraInputRefs.current[field.idx]?.focus();
             return handleError(`Lỗi: Chưa nhập thông tin cho "${field.label}".`, code);
           }

           if (fieldVal) {
                const whitelistString = currentStageObj.additionalFieldValidationLists?.[field.idx];
                if (whitelistString && whitelistString.trim()) {
                    const allowedValues = whitelistString.trim().split(/\s+/).map(s => s.toUpperCase());
                    if (allowedValues.length > 0 && !allowedValues.includes(fieldVal.toUpperCase())) {
                        extraInputRefs.current[field.idx]?.focus();
                        return handleError(`LỖI: Giá trị "${fieldVal}" không nằm trong danh sách cho phép của "${field.label}".`, code);
                    }
                }

                const minStr = currentStageObj.additionalFieldMins?.[field.idx]?.trim();
                const maxStr = currentStageObj.additionalFieldMaxs?.[field.idx]?.trim();

                if (minStr || maxStr) {
                    const valNum = parseFloat(fieldVal.replace(',', '.'));
                    if (isNaN(valNum)) {
                        extraInputRefs.current[field.idx]?.focus();
                        return handleError(`LỖI: "${field.label}" yêu cầu giá trị số.`, code);
                    }
                    if (minStr) {
                        const min = parseFloat(minStr.replace(',', '.'));
                        if (!isNaN(min) && valNum < min) {
                            extraInputRefs.current[field.idx]?.focus();
                            return handleError(`LỖI NG: Giá trị "${fieldVal}" thấp hơn mức tối thiểu (${min}) của "${field.label}".`, code);
                        }
                    }
                    if (maxStr) {
                        const max = parseFloat(maxStr.replace(',', '.'));
                        if (!isNaN(max) && valNum > max) {
                            extraInputRefs.current[field.idx]?.focus();
                            return handleError(`LỖI NG: Giá trị "${fieldVal}" cao hơn mức tối đa (${max}) của "${field.label}".`, code);
                        }
                    }
                }
           }
      }

      // DUPLICATE CHECK
      const currentProgress = productProgress[code] || 0;
      if (currentProgress >= currentStage) {
        return handleError(`Lỗi: Mã này đã được quét thành công trước đó (Tại công đoạn này).`, code);
      }

      handleSuccess(code);
    }
  };

  const handleCloseError = () => {
    setErrorModal({ isOpen: false, message: '' });
    setProductInput('');
    setTimeout(() => {
      if (!modelName.trim()) {
          // If no model, don't focus anything yet, visually they should select model
      }
      else if (!currentEmployeeId) employeeInputRef.current?.focus();
      else if (currentStageObj?.enableMeasurement) {
         if (!measurementValue) measurementInputRef.current?.focus();
         else productInputRef.current?.focus();
      }
      else if (activeExtraFields.length > 0) {
         extraInputRefs.current[activeExtraFields[0].idx]?.focus();
      }
      else productInputRef.current?.focus();
    }, 50);
  };

  const exportExcel = useCallback(() => {
    const workbook = utils.book_new();

    // 1. MERGED DATA SHEET
    // Get all valid history, sort by time DESC
    const sortedHistory = [...history].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // COLLECT DYNAMIC HEADERS STRICTLY BY STAGE ORDER
    // (Stage 1 Fields -> Stage 2 Fields -> etc.)
    const dynamicHeaderList: string[] = [];
    
    stages.forEach(s => {
        // 1. Measurement (if enabled for this stage)
        if (s.enableMeasurement && s.measurementLabel) {
            const label = s.measurementLabel.trim();
            if (label && !dynamicHeaderList.includes(label)) {
                dynamicHeaderList.push(label);
            }
        }
        
        // 2. Additional Fields (in order 1-8 for this stage)
        s.additionalFieldLabels?.forEach(l => {
            if (l && l.trim()) {
                const label = l.trim();
                // Prevent duplicates (though users usually configure distinct fields per stage)
                if (!dynamicHeaderList.includes(label)) {
                    dynamicHeaderList.push(label);
                }
            }
        });
    });

    const mergedRows = sortedHistory.map((item, index) => {
        const stageObj = stages.find(s => s.id === item.stage) || stages[0];
        const labels = stageObj.statusLabels || { valid: "OK/ĐÃ SỬA", defect: "NG/TRẢ LẠI", error: "LỖI HỆ THỐNG" };
        
        let statusText = labels.error;
        if (item.status === 'valid') statusText = labels.valid;
        if (item.status === 'defect') statusText = labels.defect;

        // Base Row
        const row: any = {
            "STT": index + 1,
            "Thời Gian": format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
            "Công Đoạn": stageObj.name,
            "Mã IMEI": item.productCode,
            "Tên Model": item.modelName || '',
        };

        // Fill Dynamic Columns (Measurement & Extra Fields) based on the record's stage
        dynamicHeaderList.forEach(header => {
            let val = "";
            
            // Only fill data if this header actually belongs to the stage of this specific record
            // OR if multiple stages share the same field name (e.g. "Notes"), fill it regardless.
            // Priority: Check if the current record's stage configuration uses this header.
            
            if (stageObj) {
                // 1. Check if this header matches the Measurement Label of the CURRENT record's stage
                if (stageObj.enableMeasurement && stageObj.measurementLabel?.trim() === header) {
                    val = item.measurement || "";
                }
                // 2. Check if this header matches any Additional Field Label of the CURRENT record's stage
                else if (stageObj.additionalFieldLabels) {
                    const fieldIndex = stageObj.additionalFieldLabels.findIndex(l => l?.trim() === header);
                    if (fieldIndex !== -1) {
                        val = item.additionalValues?.[fieldIndex] || "";
                    }
                }
            }
            
            row[header] = val;
        });

        // End Columns
        row["Nhân Viên"] = item.employeeId;
        row["Trạng Thái"] = statusText;
        row["Ghi Chú"] = item.note || '';

        return row;
    });

    const worksheet = utils.json_to_sheet(mergedRows);

    // Calculate column widths based on headers
    const basicCols = [
        { wch: 6 },  // STT
        { wch: 20 }, // Time
        { wch: 25 }, // Stage Name
        { wch: 20 }, // IMEI
        { wch: 15 }, // Model
    ];
    
    // Dynamic columns widths (auto-fit somewhat)
    const dynamicCols = dynamicHeaderList.map(h => ({ wch: Math.max(h.length + 5, 15) }));
    
    const endCols = [
        { wch: 15 }, // Employee
        { wch: 15 }, // Status
        { wch: 30 }  // Note
    ];

    worksheet['!cols'] = [...basicCols, ...dynamicCols, ...endCols];

    utils.book_append_sheet(workbook, worksheet, "Dữ Liệu Chi Tiết");

    // 2. Export Inventory Summary
    const modelStats: Record<string, { input: Set<string>, output: Set<string> }> = {};

    history.forEach(item => {
        if (item.status !== 'valid') return;
        const model = (item.modelName || "N/A").trim().toUpperCase();
        
        if (!modelStats[model]) {
            modelStats[model] = { input: new Set(), output: new Set() };
        }

        if (item.stage === 1) {
            modelStats[model].input.add(item.productCode);
        } else if (item.stage === 2) {
            modelStats[model].output.add(item.productCode);
        }
    });

    const summaryRows = Object.keys(modelStats).sort().map((model, idx) => {
        const inputCount = modelStats[model].input.size;
        const outputCount = modelStats[model].output.size;
        return {
            "STT": idx + 1,
            "Tên Model": model,
            "Tổng Nhập (Công đoạn 1)": inputCount,
            "Tổng Xuất (Công đoạn 2)": outputCount,
            "Tồn Kho (Chưa xuất)": inputCount - outputCount
        };
    });

    const summaryWs = utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [{ "Thông báo": "Chưa có dữ liệu thống kê" }]);
    const summaryCols = summaryRows.length > 0 ? Object.keys(summaryRows[0]).map(key => ({ wch: 22 })) : [{ wch: 30 }];
    summaryWs['!cols'] = summaryCols;

    utils.book_append_sheet(workbook, summaryWs, "Báo Cáo Tồn Kho");
    
    writeFile(workbook, `scan_process_data_${format(new Date(), 'yyyyMMdd_HHmmss')}.xls`);
  }, [history, stages]);

  const resetSession = () => {
    if (confirm("CẢNH BÁO: Bạn có chắc muốn xóa lịch sử quét? \n\n(Cấu hình Công đoạn và Nhân viên sẽ được GIỮ NGUYÊN)")) {
      setHistory([]);
      setProductProgress({});
      setProductStatus({});
      setProductInput('');
      setMeasurementValue('');
      
      localStorage.setItem('proscan_history', JSON.stringify([]));
      localStorage.setItem('proscan_progress', JSON.stringify({}));
      localStorage.setItem('proscan_status', JSON.stringify({}));
      
      alert("Đã xóa dữ liệu ca làm việc mới!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-slate-900 text-white p-3 shadow-lg sticky top-0 z-20">
        <div className="w-full px-2 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-blue-500/50 shadow-lg">
              <ScanLine size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wide">Hệ Thống Quản Lý Sửa Chữa</h1>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Ver 4.9 (Dynamic Excel)</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
             <div className="flex items-center gap-2">
                <Button onClick={() => setIsSettingsOpen(true)} className="text-sm p-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600" title="Cấu hình công đoạn & Model">
                  <Edit size={18} />
                </Button>
                
                <Button onClick={toggleFullScreen} className="text-sm p-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600" title="Toàn màn hình">
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </Button>

                <Button onClick={exportExcel} variant="success" className="text-sm py-2 px-4">
                  <Download size={18} className="mr-2 inline" /> Excel
                </Button>
                <Button onClick={resetSession} variant="secondary" className="text-sm py-2 px-4">
                  <RefreshCw size={18} className="mr-2 inline" /> Reset
                </Button>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* TOP: STAGE SELECTION TABS */}
          <div className="col-span-1 lg:col-span-3">
            <div className="flex space-x-4 bg-white p-3 rounded-xl shadow-sm overflow-x-auto border border-gray-200">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => setCurrentStage(stage.id)}
                  className={`px-8 py-5 rounded-lg font-bold text-xl tracking-wide whitespace-nowrap transition-all flex items-center gap-4 ${
                    currentStage === stage.id
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-transparent hover:border-gray-300'
                  }`}
                >
                  <span className={`px-3 py-1 rounded text-base ${currentStage === stage.id ? 'bg-white/20' : 'bg-gray-300 text-gray-700'}`}>
                    {stage.id}
                  </span>
                  {stage.name}
                  {currentStage === stage.id && <ChevronRight size={24} className="animate-pulse" />}
                </button>
              ))}
            </div>
          </div>

          {/* LEFT: INPUTS & STATS */}
          <div className="lg:col-span-1 space-y-4">
            
            <div className="bg-blue-600 text-white p-5 rounded-lg shadow-md flex flex-col justify-center transition-all duration-300">
                <h3 className="text-xs uppercase font-bold opacity-70 mb-1 tracking-wider">KHU VỰC LÀM VIỆC</h3>
                <div className="text-xl font-bold flex items-center gap-2 truncate tracking-wide">
                    <Layers size={24} /> <span className="truncate">{currentStageObj?.name || `Trạm kiểm tra`}</span>
                </div>
                {currentEmployeeId && (
                    <div className="mt-2 text-sm bg-blue-700/50 p-1 px-3 rounded inline-block w-fit">
                        NV: <b>{currentEmployeeId}</b>
                    </div>
                )}
            </div>

            <div className={`grid gap-3 ${currentStage > 1 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                {currentStage > 1 && (
                  <StatCard 
                    title="TỒN CHƯA XUẤT" 
                    value={pendingCount} 
                    type="warning" 
                    icon={<Clock size={24} />} 
                  />
                )}
                <StatCard 
                  title={currentStageObj.statusLabels?.valid || "OK/ĐÃ SỬA"} 
                  value={validScanCount} 
                  type="success" 
                  icon={<CheckCircle size={24} />} 
                />
                <StatCard 
                  title={currentStageObj.statusLabels?.error || "LỖI HỆ THỐNG"} 
                  value={errorScanCount} 
                  type="neutral" 
                  icon={<AlertCircle size={24} />} 
                />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
               <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2 text-base uppercase tracking-wide">
                 <ScanLine size={20} /> NHẬP LIỆU
               </div>
               <div className="p-5 space-y-6">
                  
                  {/* NEW: Model Selection Chips (Replaced Input) */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                       <Tag size={16}/> CHỌN MODEL (BẮT BUỘC)
                    </label>
                    
                    {availableModels.length === 0 ? (
                        <div className="p-3 bg-yellow-50 text-yellow-700 text-sm border border-yellow-200 rounded">
                           Chưa có model nào. Vui lòng vào <b>Cấu hình</b> để thêm.
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                            {availableModels.map((model, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleModelSelect(model)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all shadow-sm ${
                                        modelName === model 
                                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 scale-105' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                                    }`}
                                >
                                    {model}
                                </button>
                            ))}
                        </div>
                    )}
                    {modelName && (
                        <div className="text-xs text-blue-600 font-semibold mt-1">
                            Đang chọn: <span className="underline text-lg">{modelName}</span>
                        </div>
                    )}
                  </div>

                  <hr className="border-gray-100"/>

                  {/* Employee */}
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">1. Nhân viên</label>
                    <div className="relative">
                      <input
                        ref={employeeInputRef}
                        className={`w-full text-lg p-3 pl-10 border rounded focus:outline-none transition-colors tracking-wide ${currentEmployeeId ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-gray-300 focus:border-blue-500'}`}
                        placeholder={currentEmployeeId ? "Đổi nhân viên..." : "Scan mã NV để bắt đầu..."}
                        value={employeeInput}
                        onChange={e => setEmployeeInput(e.target.value)}
                        onKeyDown={handleEmployeeScan}
                      />
                      <Users className="absolute left-3 top-3.5 text-gray-400" size={20} />
                      {currentEmployeeId && (
                        <div className="absolute right-2 top-3 text-green-700 font-bold text-xs bg-green-200 px-2 py-1 rounded border border-green-300">
                          {currentEmployeeId}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <hr className="border-gray-100"/>

                  {/* Measurement Input */}
                  {currentStageObj?.enableMeasurement && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                      <div>
                        <label className="block text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
                          <Activity size={18} className="text-purple-600"/>
                          2. {currentStageObj.measurementLabel || "Kết quả"} (Bắt buộc)
                        </label>
                        <input
                          ref={measurementInputRef}
                          className="w-full text-lg p-3 border-2 border-purple-300 bg-purple-50 rounded focus:border-purple-500 focus:outline-none placeholder-purple-300 tracking-wide"
                          placeholder={currentStageObj.measurementStandard ? `Nhập giá trị (Chuẩn: ${currentStageObj.measurementStandard})...` : `Nhập ${currentStageObj.measurementLabel || "giá trị"}...`}
                          value={measurementValue}
                          onChange={e => setMeasurementValue(e.target.value)}
                          onKeyDown={handleMeasurementScan}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Extra Fields (Dynamic Error Inputs) */}
                  {activeExtraFields.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                           <label className="block text-sm font-bold text-gray-500 mb-3 uppercase flex items-center gap-2 tracking-wide">
                             <List size={14}/> Thông tin chi tiết (Lỗi/Linh kiện)
                           </label>
                           {/* Use grid-cols-1 on small screens, cols-2 on medium to accomodate longer error descriptions */}
                           <div className="grid grid-cols-1 gap-4">
                              {activeExtraFields.map((field) => (
                                <div key={field.idx}>
                                   <label className="block text-xs font-bold text-blue-800 mb-1.5 truncate flex items-center gap-1.5 tracking-wide" title={field.label}>
                                      <PenTool size={12} /> {field.label}
                                   </label>
                                   <input
                                      ref={(el) => { extraInputRefs.current[field.idx] = el; }}
                                      value={additionalValues[field.idx]}
                                      onChange={(e) => updateAdditionalValue(field.idx, e.target.value)}
                                      onKeyDown={(e) => handleExtraInputScan(e, field.idx)}
                                      className="w-full p-2.5 text-base border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none bg-white shadow-sm tracking-wide"
                                      placeholder={currentStageObj.additionalFieldDefaults?.[field.idx] ? `Mặc định: ${currentStageObj.additionalFieldDefaults?.[field.idx]}` : "Nhập thông tin..."}
                                   />
                                </div>
                              ))}
                           </div>
                        </div>
                  )}

                  {/* Product */}
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">
                      {currentStageObj?.enableMeasurement || activeExtraFields.length > 0 ? "3" : "2"}. Mã IMEI máy (Enter để lưu)
                    </label>
                    <div className="relative">
                      <input
                        ref={productInputRef}
                        disabled={errorModal.isOpen}
                        className={`w-full text-2xl font-mono p-4 pl-12 border rounded shadow-inner focus:outline-none transition-colors tracking-wide
                          ${errorModal.isOpen 
                            ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                            : 'bg-white border-blue-600 ring-4 ring-blue-50/50'}
                        `}
                        placeholder={
                          !modelName ? "⚠️ Chọn MODEL trước" :
                          !currentEmployeeId ? "⚠️ Quét nhân viên trước" :
                          "Sẵn sàng scan IMEI..."
                        }
                        value={productInput}
                        onChange={e => setProductInput(e.target.value)}
                        onKeyDown={handleProductScan}
                      />
                      <Box className={`absolute left-3 top-1/2 -translate-y-1/2 ${currentEmployeeId && modelName ? 'text-blue-600' : 'text-gray-400'}`} size={28} />
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* RIGHT: HISTORY TABLE */}
          <div className="lg:col-span-2 h-[calc(100vh-220px)] min-h-[500px]">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
               <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                  <h3 className="font-bold text-gray-700 text-base tracking-wide">Lịch sử Quét (Khu vực này)</h3>
                  <div className="text-sm flex gap-4 font-medium">
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> OK</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> NG</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Err</span>
                  </div>
               </div>
               
               <div className="flex-1 overflow-auto">
                 <table className="w-full text-left text-base tracking-wide">
                   <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                     <tr>
                       <th className="p-4 font-semibold w-16 text-center">STT</th>
                       <th className="p-4 font-semibold">Công Đoạn</th>
                       <th className="p-4 font-semibold">Mã IMEI máy</th>
                       <th className="p-4 font-semibold text-blue-700">Tên Model</th>
                       <th className="p-4 font-semibold">Chi tiết Sửa chữa / Lỗi</th>
                       <th className="p-4 font-semibold">Nhân Viên</th>
                       <th className="p-4 font-semibold">Trạng Thái</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {history.length === 0 ? (
                       <tr><td colSpan={7} className="p-10 text-center text-gray-400 italic text-lg">Chưa có dữ liệu</td></tr>
                     ) : (
                       history.map((row) => {
                         const rowStageObj = stages.find(s => s.id === row.stage);
                         const labels = rowStageObj?.statusLabels || { valid: "OK", defect: "NG", error: "ERR" };
                         
                         let rowClass = "";
                         if (row.status === 'valid') rowClass = "border-l-4 border-l-green-500 hover:bg-gray-50";
                         else if (row.status === 'defect') rowClass = "border-l-4 border-l-amber-500 bg-amber-50 hover:bg-amber-100";
                         else rowClass = "border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100";
                         
                         const renderExtended = () => {
                           if (!row.additionalValues || row.additionalValues.every(v => !v)) return null;
                           return (
                             <div className="mt-1 flex flex-col gap-1">
                               {row.additionalValues.map((v, i) => {
                                 if (!v) return null;
                                 const label = rowStageObj?.additionalFieldLabels?.[i];
                                 return (
                                   <span key={i} className="text-xs bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-100 w-fit">
                                     {label ? <span className="font-semibold text-purple-900">{label}:</span> : ''} {v}
                                   </span>
                                 )
                               })}
                             </div>
                           )
                         };

                         return (
                           <tr key={row.id} className={rowClass}>
                             <td className="p-4 text-gray-500 text-center">{row.stt}</td>
                             <td className="p-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${row.stage === currentStage ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {rowStageObj?.name || `Stage ${row.stage}`}
                                </span>
                             </td>
                             <td className={`p-4 font-mono font-medium ${row.status === 'error' ? 'text-red-700 line-through' : row.status === 'defect' ? 'text-amber-800' : 'text-blue-700'}`}>
                               {row.productCode}
                             </td>
                             <td className="p-4 font-bold text-gray-700">
                               {row.modelName || <span className="text-gray-300">-</span>}
                             </td>
                             <td className="p-4 align-top">
                                {row.measurement && <div className="font-bold text-purple-700 mb-1">{rowStageObj?.measurementLabel}: {row.measurement}</div>}
                                {renderExtended()}
                             </td>
                             <td className="p-4 text-gray-900">{row.employeeId}</td>
                             <td className="p-4">
                               {row.status === 'valid' ? (
                                 <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                   <CheckCircle size={16} className="text-green-500"/>
                                   <span className="font-bold text-green-700">{labels.valid}</span>
                                   <span className="opacity-50">|</span>
                                   {format(new Date(row.timestamp), 'HH:mm:ss')}
                                 </div>
                               ) : row.status === 'defect' ? (
                                  <span className="text-amber-700 font-bold text-sm flex items-center gap-1.5">
                                   <XCircle size={16}/> {labels.defect}: {row.note}
                                 </span>
                               ) : (
                                 <span className="text-red-600 font-bold text-sm flex items-center gap-1.5">
                                   <AlertTriangle size={16}/> {labels.error}: {row.note}
                                 </span>
                               )}
                             </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
      </main>

      <ErrorModal isOpen={errorModal.isOpen} message={errorModal.message} onClose={handleCloseError} />

      <StageSettingsModal 
        isOpen={isSettingsOpen}
        stages={stages}
        availableModels={availableModels}
        onSave={(newStages, newModels) => {
            setStages(newStages);
            setAvailableModels(newModels);
        }}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
