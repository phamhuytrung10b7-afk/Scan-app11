
import React, { useState, useEffect } from 'react';
import { Save, X, Activity, ListPlus, CheckSquare, Upload, Trash2, ArrowRightLeft, Tag } from 'lucide-react';
import { read, utils } from 'xlsx';
import { Button } from './Button';
import { Stage } from './types';

interface StageSettingsModalProps {
  isOpen: boolean;
  stages: Stage[];
  onSave: (newStages: Stage[]) => void;
  onClose: () => void;
}

export const StageSettingsModal: React.FC<StageSettingsModalProps> = ({ isOpen, stages, onSave, onClose }) => {
  const [localStages, setLocalStages] = useState<Stage[]>(stages);

  // Helper to ensure array is size 8
  const ensureSize8 = (arr?: string[]) => {
    const newArr = arr ? [...arr] : [];
    while (newArr.length < 8) newArr.push("");
    return newArr.slice(0, 8);
  };

  useEffect(() => {
    // Ensure compatibility with data structure
    const sanitizedStages = stages.map(s => ({
      ...s,
      additionalFieldLabels: ensureSize8(s.additionalFieldLabels),
      additionalFieldDefaults: ensureSize8(s.additionalFieldDefaults),
      additionalFieldValidationLists: ensureSize8(s.additionalFieldValidationLists),
      additionalFieldMins: ensureSize8(s.additionalFieldMins),
      additionalFieldMaxs: ensureSize8(s.additionalFieldMaxs),
      validationRules: s.validationRules || [],
      statusLabels: s.statusLabels || { valid: "OK/ĐÃ SỬA", defect: "NG/TRẢ LẠI", error: "LỖI HỆ THỐNG" }
    }));
    setLocalStages(sanitizedStages);
  }, [stages, isOpen]);

  const handleNameChange = (id: number, newName: string) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleToggleMeasurement = (id: number) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, enableMeasurement: !s.enableMeasurement } : s));
  };

  const handleLabelChange = (id: number, newLabel: string) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, measurementLabel: newLabel } : s));
  };

  const handleStandardChange = (id: number, newVal: string) => {
    setLocalStages(prev => prev.map(s => s.id === id ? { ...s, measurementStandard: newVal } : s));
  };

  const handleStatusLabelChange = (id: number, type: 'valid' | 'defect' | 'error', newVal: string) => {
    setLocalStages(prev => prev.map(s => {
      if (s.id !== id) return s;
      const currentLabels = s.statusLabels || { valid: "OK/ĐÃ SỬA", defect: "NG/TRẢ LẠI", error: "LỖI HỆ THỐNG" };
      return { 
        ...s, 
        statusLabels: { ...currentLabels, [type]: newVal } 
      };
    }));
  };

  const handleAdditionalFieldConfig = (stageId: number, fieldIndex: number, type: 'label' | 'default' | 'min' | 'max', value: string) => {
    setLocalStages(prev => prev.map(s => {
      if (s.id !== stageId) return s;
      
      const newLabels = ensureSize8(s.additionalFieldLabels);
      const newDefaults = ensureSize8(s.additionalFieldDefaults);
      const newMins = ensureSize8(s.additionalFieldMins);
      const newMaxs = ensureSize8(s.additionalFieldMaxs);

      if (type === 'label') newLabels[fieldIndex] = value;
      if (type === 'default') newDefaults[fieldIndex] = value;
      if (type === 'min') newMins[fieldIndex] = value;
      if (type === 'max') newMaxs[fieldIndex] = value;

      return { 
        ...s, 
        additionalFieldLabels: newLabels, 
        additionalFieldDefaults: newDefaults,
        additionalFieldMins: newMins,
        additionalFieldMaxs: newMaxs
      };
    }));
  };

  // Upload handler for extended fields
  const handleFieldListUpload = async (e: React.ChangeEvent<HTMLInputElement>, stageId: number, fieldIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const codes = jsonData
          .map(row => row[0])
          .filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
          .map(cell => String(cell).trim());

      if (codes.length === 0) {
        alert("File không có dữ liệu ở cột A!");
        return;
      }

      const resultString = codes.join(' ');

      setLocalStages(prev => prev.map(s => {
        if (s.id !== stageId) return s;
        const newLists = ensureSize8(s.additionalFieldValidationLists);
        newLists[fieldIndex] = resultString;
        return { ...s, additionalFieldValidationLists: newLists };
      }));
      
      alert(`Đã tải thành công ${codes.length} mã vào danh sách cho thông số ${fieldIndex + 1}!`);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert("Lỗi đọc file Excel.");
    }
  };

  const clearFieldList = (stageId: number, fieldIndex: number) => {
      setLocalStages(prev => prev.map(s => {
        if (s.id !== stageId) return s;
        const newLists = ensureSize8(s.additionalFieldValidationLists);
        newLists[fieldIndex] = "";
        return { ...s, additionalFieldValidationLists: newLists };
      }));
  };

  const handleSave = () => {
    onSave(localStages);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            ⚙️ Cấu hình Công Đoạn & Validate
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {localStages.map((stage) => (
            <div key={stage.id} className="p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-sm space-y-6">
              
              {/* HEADER CONFIG */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {stage.id}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-500 uppercase mb-1">
                    Tên công đoạn
                  </label>
                  <input 
                    type="text"
                    value={stage.name}
                    onChange={(e) => handleNameChange(stage.id, e.target.value)}
                    className="w-full p-2.5 text-lg border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={`Tên công đoạn ${stage.id}...`}
                  />
                </div>
                <div className="flex items-center gap-2 mt-7 md:mt-0">
                    <input 
                      type="checkbox" 
                      id={`measure-${stage.id}`}
                      checked={!!stage.enableMeasurement}
                      onChange={() => handleToggleMeasurement(stage.id)}
                      className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`measure-${stage.id}`} className="text-base font-bold text-gray-700 select-none cursor-pointer flex items-center gap-1">
                       <Activity size={20} /> Kích hoạt Test?
                    </label>
                 </div>
              </div>

              <hr className="border-gray-200" />

              {/* MEASUREMENT CONFIG (Existing) */}
              {stage.enableMeasurement && (
                <div className="mt-4 pl-0 md:pl-16">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Main Measurement Label */}
                      <div className="bg-white p-4 rounded border border-blue-200 flex flex-col gap-4">
                        <div>
                          <label className="block text-sm font-bold text-blue-700 uppercase mb-1">
                            1. Tên Kết quả chính (Bắt buộc)
                          </label>
                          <input 
                            type="text"
                            value={stage.measurementLabel || ''}
                            onChange={(e) => handleLabelChange(stage.id, e.target.value)}
                            className="w-full p-2.5 text-base border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="VD: Kết quả Test..."
                          />
                        </div>

                        {/* Measurement Standard Value */}
                        <div className="relative">
                          <label className="block text-sm font-bold text-green-700 uppercase mb-1 flex items-center gap-1">
                            <CheckSquare size={16}/> Giá trị Tiêu Chuẩn (Main)
                          </label>
                          <input 
                            type="text"
                            value={stage.measurementStandard || ''}
                            onChange={(e) => handleStandardChange(stage.id, e.target.value)}
                            className="w-full p-2.5 text-base border-2 border-green-200 bg-green-50 rounded focus:ring-2 focus:ring-green-500 outline-none placeholder-green-300"
                            placeholder="VD: PASS (chữ) hoặc 10.5 (số)..."
                          />
                        </div>
                      </div>

                      {/* 8 Additional Fields */}
                      <div className="md:col-span-2 lg:col-span-1">
                         <label className="block text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                           <ListPlus size={18}/> 2. Cấu hình 8 thông số mở rộng
                         </label>
                         
                         <div className="grid grid-cols-2 gap-3">
                            {/* Loop 8 times */}
                            {Array.from({ length: 8 }).map((_, idx) => {
                              const listContent = stage.additionalFieldValidationLists?.[idx] || "";
                              const count = listContent ? listContent.split(/\s+/).filter(s => s).length : 0;

                              return (
                                <div key={idx} className="bg-white p-3 rounded border border-gray-300 flex flex-col gap-2 relative group">
                                  <span className="absolute -top-2 -left-2 bg-gray-200 text-gray-600 text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold">
                                    {idx + 1}
                                  </span>
                                  
                                  {/* Label & Default Row */}
                                  <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Tên thông số</label>
                                    <input
                                      type="text"
                                      value={stage.additionalFieldLabels?.[idx] || ""}
                                      onChange={(e) => handleAdditionalFieldConfig(stage.id, idx, 'label', e.target.value)}
                                      className="w-full p-2 text-sm border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                                      placeholder="Tắt..."
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-green-600 uppercase">Mặc định</label>
                                    <input
                                      type="text"
                                      value={stage.additionalFieldDefaults?.[idx] || ""}
                                      onChange={(e) => handleAdditionalFieldConfig(stage.id, idx, 'default', e.target.value)}
                                      className="w-full p-2 text-sm border border-green-200 bg-green-50 rounded focus:border-green-500 focus:outline-none placeholder-green-200"
                                      placeholder="Auto..."
                                    />
                                  </div>

                                  {/* Min / Max Row */}
                                  <div className="grid grid-cols-2 gap-1.5">
                                      <div>
                                        <label className="text-[10px] font-semibold text-gray-400 uppercase flex items-center gap-0.5"><ArrowRightLeft size={10}/> Min</label>
                                        <input
                                          type="text" // Keep as text to allow flexible input, validation on save/scan
                                          value={stage.additionalFieldMins?.[idx] || ""}
                                          onChange={(e) => handleAdditionalFieldConfig(stage.id, idx, 'min', e.target.value)}
                                          className="w-full p-1.5 text-xs border border-dashed border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                          placeholder="Min..."
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-gray-400 uppercase flex items-center gap-0.5"><ArrowRightLeft size={10}/> Max</label>
                                        <input
                                          type="text"
                                          value={stage.additionalFieldMaxs?.[idx] || ""}
                                          onChange={(e) => handleAdditionalFieldConfig(stage.id, idx, 'max', e.target.value)}
                                          className="w-full p-1.5 text-xs border border-dashed border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                          placeholder="Max..."
                                        />
                                      </div>
                                  </div>

                                  {/* List Upload Row */}
                                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                                     <div className="flex items-center gap-1">
                                        <label className={`cursor-pointer p-1.5 rounded hover:bg-gray-100 border ${count > 0 ? 'border-green-200 bg-green-50 text-green-600' : 'border-gray-200 text-gray-400'}`} title="Upload danh sách hợp lệ (Excel cột A)">
                                           <Upload size={14} />
                                           <input 
                                              type="file" 
                                              className="hidden" 
                                              accept=".xlsx, .xls, .csv" 
                                              onChange={(e) => handleFieldListUpload(e, stage.id, idx)}
                                           />
                                        </label>
                                        {count > 0 && (
                                           <span className="text-xs font-bold text-green-600">{count} mã</span>
                                        )}
                                     </div>
                                     {count > 0 && (
                                        <button 
                                          onClick={() => clearFieldList(stage.id, idx)}
                                          className="text-red-400 hover:text-red-600 p-1" 
                                          title="Xóa danh sách"
                                        >
                                           <Trash2 size={14} />
                                        </button>
                                     )}
                                  </div>
                                </div>
                              );
                            })}
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* STATUS LABEL CONFIGURATION */}
              <div className="mt-4 pl-0 md:pl-16">
                 <label className="block text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Tag size={18}/> 3. Cấu hình Tên Trạng Thái (Hiển thị & Excel)
                 </label>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                        <label className="block text-xs font-bold text-green-700 uppercase mb-1">Trạng thái OK</label>
                        <input
                          type="text"
                          value={stage.statusLabels?.valid || "OK/ĐÃ SỬA"}
                          onChange={(e) => handleStatusLabelChange(stage.id, 'valid', e.target.value)}
                          className="w-full p-2.5 text-base border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div className="bg-amber-50 p-3 rounded border border-amber-200">
                        <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Trạng thái NG</label>
                        <input
                          type="text"
                          value={stage.statusLabels?.defect || "NG/TRẢ LẠI"}
                          onChange={(e) => handleStatusLabelChange(stage.id, 'defect', e.target.value)}
                          className="w-full p-2.5 text-base border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-300">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Trạng thái LỖI</label>
                        <input
                          type="text"
                          value={stage.statusLabels?.error || "LỖI HỆ THỐNG"}
                          onChange={(e) => handleStatusLabelChange(stage.id, 'error', e.target.value)}
                          className="w-full p-2.5 text-base border border-gray-400 rounded focus:ring-1 focus:ring-gray-500 outline-none"
                        />
                    </div>
                 </div>
              </div>

            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose} className="text-lg px-6 py-2">
            Hủy bỏ
          </Button>
          <Button variant="primary" onClick={handleSave} className="flex items-center gap-2 text-lg px-6 py-2">
            <Save size={20} /> Lưu Thay Đổi
          </Button>
        </div>
      </div>
    </div>
  );
};
