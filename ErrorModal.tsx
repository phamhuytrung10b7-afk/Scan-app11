import React, { useEffect, useRef } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, message, onClose }) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the button immediately when modal opens so "Enter" closes it
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 border-t-8 border-red-600 p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <XCircle size={64} className="text-red-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-red-600 mb-2">SCAN LỖI</h2>
          <p className="text-xl font-medium text-gray-800 mb-8">{message}</p>
          
          <Button 
            ref={confirmButtonRef}
            onClick={onClose}
            variant="danger"
            className="w-full text-xl py-4"
          >
            ĐÓNG (ENTER)
          </Button>
          
          <p className="mt-4 text-sm text-gray-500">
            Bấm Enter hoặc Click nút để tiếp tục
          </p>
        </div>
      </div>
    </div>
  );
};