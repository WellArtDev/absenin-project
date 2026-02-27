const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

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

module.exports = { authenticate, superadminOnly, adminOnly };
