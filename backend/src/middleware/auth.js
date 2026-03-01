const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const FREE_DEFAULT_FEATURES = ['attendance', 'selfie', 'gps', 'dashboard', 'export_csv'];
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
  notifikasi: 'notifications',
  notifications: 'notifications',
  'broadcast whatsapp': 'broadcast',
  broadcast: 'broadcast',
  'multi cabang': 'multi_branch',
  multi_branch: 'multi_branch',
  'api access': 'api_access',
  api_access: 'api_access'
};

const normalizeFeatureKey = (value) => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return '';
  return FEATURE_ALIASES[normalized] || normalized.replace(/ /g, '_');
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'Token tidak ditemukan.' });
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      `SELECT u.id, u.email, u.role, u.company_id, u.name, c.name as company_name, c.plan, c.is_active as company_active
       FROM users u LEFT JOIN companies c ON u.company_id = c.id WHERE u.id = $1 AND u.is_active = true`, [decoded.userId]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'User tidak ditemukan.' });
    const user = result.rows[0];
    if (user.role !== 'superadmin' && !user.company_active) {
      return res.status(403).json({ success: false, message: 'Perusahaan Anda dinonaktifkan.' });
    }
    req.user = {
      userId: user.id, email: user.email, name: user.name,
      role: user.role, companyId: user.company_id,
      companyName: user.company_name, plan: user.plan
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired.' });
    return res.status(401).json({ success: false, message: 'Token tidak valid.' });
  }
};

const superadminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Hanya superadmin.' });
  next();
};

const adminOnly = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Hanya admin.' });
  next();
};

const getCompanyFeatures = async (companyId) => {
  const r = await query(`
    SELECT p.features
    FROM companies c
    LEFT JOIN plans p ON p.slug = c.plan
    WHERE c.id = $1
    LIMIT 1
  `, [companyId]);

  if (r.rows.length === 0) return FREE_DEFAULT_FEATURES;
  const raw = r.rows[0].features;
  if (!raw) return FREE_DEFAULT_FEATURES;

  if (Array.isArray(raw)) {
    const normalized = raw.map(normalizeFeatureKey).filter(Boolean);
    return [...new Set(normalized)];
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizeFeatureKey).filter(Boolean);
        return [...new Set(normalized)];
      }
      return FREE_DEFAULT_FEATURES;
    } catch {
      return FREE_DEFAULT_FEATURES;
    }
  }

  return FREE_DEFAULT_FEATURES;
};

const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'superadmin') return next();
      if (!req.user?.companyId) return res.status(401).json({ success: false, message: 'Company tidak ditemukan.' });

      const features = await getCompanyFeatures(req.user.companyId);
      req.user.companyFeatures = features;

      const required = normalizeFeatureKey(featureKey);
      if (!features.includes(required)) {
        return res.status(403).json({
          success: false,
          message: `Fitur \"${required}\" tidak tersedia di paket Anda. Silakan upgrade paket.`
        });
      }

      next();
    } catch (error) {
      console.error('Feature gate error:', error);
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
  };
};

module.exports = { authenticate, superadminOnly, adminOnly, requireFeature };
