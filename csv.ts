import { ScanRecord } from './types';

export const exportToCSV = (data: ScanRecord[], filename: string) => {
  // BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  const headers = ['STT', 'Mã Scan', 'Model SX', 'Ngày Giờ', 'Trạng Thái'];
  
  const rows = data.map((item, index) => {
    const statusText = 
      item.status === 'valid' ? 'Hợp lệ' :
      item.status === 'duplicate' ? 'Mã trùng' : 'Sai model';
      
    return [
      data.length - index, // Reverse STT because typically we show newest first, but for export maybe sequential? Let's match table ID.
      `"${item.code.replace(/"/g, '""')}"`, // Escape quotes
      item.targetModel,
      item.timestamp,
      statusText
    ].join(',');
  });

  const csvContent = BOM + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
