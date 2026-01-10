export type ScanStatus = 'valid' | 'duplicate' | 'wrong_model';

export interface ScanRecord {
  id: number;
  code: string;
  targetModel: string;
  timestamp: string;
  status: ScanStatus;
  rawTimestamp: number; // For sorting if needed
}

export interface AppSettings {
  targetModel: string;
  soundEnabled: boolean;
}
