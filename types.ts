export interface ImeiRecord {
  id: string;
  code: string;
  timestamp: Date;
}

export type ScanStatus = 'idle' | 'success' | 'error';
