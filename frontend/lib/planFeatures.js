export const PLAN_FEATURE_OPTIONS = [
  { key: 'attendance', label: 'Absensi WhatsApp' },
  { key: 'selfie', label: 'Selfie Verification' },
  { key: 'gps', label: 'GPS Tracking' },
  { key: 'dashboard', label: 'Dashboard & Analytics' },
  { key: 'export_csv', label: 'Export CSV' },
  { key: 'overtime', label: 'Manajemen Lembur' },
  { key: 'leave_management', label: 'Manajemen Cuti' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'attendance_slip', label: 'Slip Absensi' },
  { key: 'shift_management', label: 'Manajemen Shift' },
  { key: 'office_locations', label: 'Lokasi Kantor' },
  { key: 'qr_attendance', label: 'QR Attendance' },
  { key: 'notifications', label: 'Notifikasi Manager' },
  { key: 'broadcast', label: 'Broadcast WhatsApp' },
  { key: 'multi_branch', label: 'Multi Cabang' },
  { key: 'api_access', label: 'API Access' }
];

const FEATURE_LABEL_MAP = PLAN_FEATURE_OPTIONS.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

const FEATURE_ALIASES = {
  'absensi whatsapp': 'attendance',
  absensi: 'attendance',
  attendance: 'attendance',
  'selfie verification': 'selfie',
  selfie: 'selfie',
  gps: 'gps',
  'gps tracking': 'gps',
  dashboard: 'dashboard',
  analytics: 'dashboard',
  'export csv': 'export_csv',
  export_csv: 'export_csv',
  'manajemen lembur': 'overtime',
  lembur: 'overtime',
  overtime: 'overtime',
  'manajemen cuti': 'leave_management',
  cuti: 'leave_management',
  leave_management: 'leave_management',
  payroll: 'payroll',
  'slip absensi': 'attendance_slip',
  attendance_slip: 'attendance_slip',
  'manajemen shift': 'shift_management',
  shift: 'shift_management',
  shift_management: 'shift_management',
  'lokasi kantor': 'office_locations',
  office_locations: 'office_locations',
  'qr attendance': 'qr_attendance',
  'qr code': 'qr_attendance',
  qr_attendance: 'qr_attendance',
  'notifikasi manager': 'notifications',
  notifications: 'notifications',
  'broadcast whatsapp': 'broadcast',
  broadcast: 'broadcast',
  'multi cabang': 'multi_branch',
  multi_branch: 'multi_branch',
  'api access': 'api_access',
  api_access: 'api_access'
};

export const normalizePlanFeatureKey = (feature) => {
  if (!feature && feature !== 0) return '';
  const normalized = String(feature).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return '';
  return FEATURE_ALIASES[normalized] || normalized.replace(/ /g, '_');
};

export const getFeatureLabel = (feature) => {
  if (!feature) return '';
  const key = normalizePlanFeatureKey(feature);
  return FEATURE_LABEL_MAP[key] || String(feature).replace(/_/g, ' ');
};
