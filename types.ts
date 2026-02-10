
export interface ValidationRule {
  id: string;
  name: string; // Tên gợi nhớ (VD: List Model A, Check độ dài)
  type: 'contains' | 'not_contains' | 'starts_with' | 'length_eq';
  value: string; // Giá trị để so sánh (List phân cách bởi khoảng trắng/phẩy, hoặc số)
  isActive: boolean; // Trạng thái bật tắt
  errorMessage: string; // Câu báo lỗi riêng
}

export interface ScanRecord {
  id: string;
  stt: number;
  productCode: string;
  model: string; // Used as validation prefix/pattern (Mã IMEI)
  modelName?: string; // New field for the actual Model Name
  employeeId: string;
  timestamp: string; // ISO string
  status: 'valid' | 'error' | 'defect'; // Added 'defect' for manufacturing errors (NG)
  note?: string; 
  stage: number; // The stage where this scan happened (1-5)
  measurement?: string; // Recorded value (e.g. "12V", "PASS", "0.5kg")
  additionalValues?: string[]; // Values for the 8 custom fields
}

export interface Stats {
  success: number; // Count for current stage (OK)
  defect: number;  // Count for manufacturing defects (NG)
  error: number;   // System/Validation errors
}

export interface ErrorState {
  isOpen: boolean;
  message: string;
}

export interface StatusLabels {
  valid: string;
  defect: string;
  error: string;
}

export interface Stage {
  id: number;
  name: string;
  // Removed isEnabled
  enableMeasurement?: boolean; // Does this stage require a measurement?
  measurementLabel?: string;   // Label for the measurement
  measurementStandard?: string; // New: Standard value to compare against (e.g. "PASS", "OK")
  additionalFieldLabels?: string[]; // Labels for 8 custom fields. Empty string = disabled.
  additionalFieldDefaults?: string[]; // New: Default values for the 8 fields.
  additionalFieldValidationLists?: string[]; // New: Whitelists for the 8 fields (string data).
  additionalFieldMins?: string[]; // New: Min values for range check
  additionalFieldMaxs?: string[]; // New: Max values for range check
  validationRules?: ValidationRule[]; // New: List of flexible validation rules
  statusLabels?: StatusLabels; // New: Custom labels for OK, NG, Error
}

// Helper to create empty arrays of size 8
const EMPTY_8 = Array(8).fill("");

export const DEFAULT_PROCESS_STAGES: Stage[] = [
  { 
    id: 1, 
    name: "1. Nhập máy lỗi (Input)", 
    enableMeasurement: false, 
    measurementLabel: "", 
    measurementStandard: "", 
    // Field 1 used for initial defect description
    additionalFieldLabels: ["Lỗi sơ bộ/Khách báo", "", "", "", "", "", "", ""], 
    additionalFieldDefaults: [...EMPTY_8],
    additionalFieldValidationLists: [...EMPTY_8],
    additionalFieldMins: [...EMPTY_8],
    additionalFieldMaxs: [...EMPTY_8],
    validationRules: [],
    statusLabels: {
      valid: "OK/ĐÃ SỬA",
      defect: "NG/TRẢ LẠI",
      error: "LỖI HỆ THỐNG"
    }
  },
  { 
    id: 2, 
    name: "2. Xuất sau sửa (Output)", 
    enableMeasurement: true, 
    measurementLabel: "Kết quả Sửa", 
    measurementStandard: "OK", 
    // Fields configured for detailed defect tracking (up to 3 errors)
    additionalFieldLabels: ["Nguyên nhân Lỗi 1", "Nguyên nhân Lỗi 2", "Nguyên nhân Lỗi 3", "Linh kiện thay thế", "", "", "", ""], 
    additionalFieldDefaults: ["", "", "", "", "", "", "", ""],
    additionalFieldValidationLists: [...EMPTY_8],
    additionalFieldMins: [...EMPTY_8],
    additionalFieldMaxs: [...EMPTY_8],
    validationRules: [],
    statusLabels: {
      valid: "ĐẠT CHUẨN",
      defect: "LỖI LẠI",
      error: "SAI QUY TRÌNH"
    }
  }
];
