import React, { useState } from 'react';
import { X, Save, Trash2, Download } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  onSave: (newModel: string) => void;
  onResetData: () => void;
  onExport: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, currentModel, onSave, onResetData, onExport 
}) => {
  const [modelInput, setModelInput] = useState(currentModel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">Cấu Hình Sản Xuất</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="px-6 py-6 space-y-6">
          
          {/* Model Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mã Model Hiện Tại (Bắt buộc)
            </label>
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value.toUpperCase())} // Auto uppercase
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="Ví dụ: ABC-2024"
            />
            <p className="mt-1 text-xs text-gray-500">
              Mã scan phải chứa chuỗi này để được coi là hợp lệ.
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Tác vụ dữ liệu</h4>
            <div className="flex flex-col gap-3">
              <button 
                onClick={onExport}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Xuất báo cáo Excel/CSV
              </button>

              <button 
                onClick={() => {
                  if(window.confirm('CẢNH BÁO: Hành động này sẽ xóa toàn bộ lịch sử quét. Bạn có chắc chắn không?')) {
                    onResetData();
                    onClose();
                  }
                }}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa toàn bộ dữ liệu (Reset)
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 mr-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              onSave(modelInput);
              onClose();
            }}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};
