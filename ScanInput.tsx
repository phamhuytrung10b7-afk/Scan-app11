import React, { useRef, useEffect, useState } from 'react';
import { ScanLine } from 'lucide-react';

interface ScanInputProps {
  onScan: (code: string) => void;
  isDisabled?: boolean;
}

export const ScanInput: React.FC<ScanInputProps> = ({ onScan, isDisabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  // Auto-focus logic
  useEffect(() => {
    const focusInput = () => {
      if (!isDisabled && inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Initial focus
    focusInput();

    // Re-focus when clicking anywhere (unless it's a button/interactive element)
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (['BUTTON', 'A', 'INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      focusInput();
    };

    const handleBlur = () => {
       // Small delay to allow button clicks to register before pulling focus back
       setTimeout(focusInput, 100);
    };

    document.addEventListener('click', handleGlobalClick);
    const currentRef = inputRef.current;
    if (currentRef) {
      currentRef.addEventListener('blur', handleBlur);
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      if (currentRef) {
        currentRef.removeEventListener('blur', handleBlur);
      }
    };
  }, [isDisabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (value.trim()) {
        onScan(value.trim());
        setValue('');
      }
    }
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <ScanLine className="w-6 h-6 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="block w-full p-4 pl-12 text-xl font-mono text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 uppercase shadow-inner"
        placeholder="SCAN HERE..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        autoComplete="off"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
         <span className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded bg-white">Auto-Focus ON</span>
      </div>
    </div>
  );
};
