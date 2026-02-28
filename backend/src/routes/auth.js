const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('company').trim().notEmpty(),
  body('phone').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { email, password, company, name, phone } = req.body;
    const existing = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });

    const result = await transaction(async (client) => {
      const slug = company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const c = await client.query('INSERT INTO companies (name,slug) VALUES ($1,$2) RETURNING id,name,plan,max_employees', [company, `${slug}-${Date.now()}`]);
      const cid = c.rows[0].id;
      const hp = await bcrypt.hash(password, 12);
      const u = await client.query('INSERT INTO users (email,password,name,phone,role,company_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,email,name,role,phone', 
        [email, hp, name || email.split('@')[0], phone || null, 'admin', cid]);
      await client.query('INSERT INTO company_settings (company_id) VALUES ($1)', [cid]);
      return { user: u.rows[0], company: c.rows[0] };
    });

    const token = jwt.sign({ userId: result.user.id, companyId: result.company.id, role: result.user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({ success: true, message: 'Registrasi berhasil!', data: { token, user: result.user, company: result.company } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/login', [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { email, password } = req.body;
    const result = await query('SELECT u.*, c.name as company_name, c.plan, c.is_active as company_active FROM users u JOIN companies c ON u.company_id=c.id WHERE u.email=$1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    const user = result.rows[0];
    if (!user.is_active) return res.status(401).json({ success: false, message: 'Akun dinonaktifkan.' });
    if (user.role !== 'superadmin' && !user.company_active) return res.status(401).json({ success: false, message: 'Perusahaan dinonaktifkan.' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    
    await query('UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=$1', [user.id]);
    const token = jwt.sign({ userId: user.id, companyId: user.company_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, companyName: user.company_name, plan: user.plan } } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id,u.email,u.name,u.role,u.phone,u.company_id, c.name as company_name,c.plan,c.max_employees,c.is_active as company_active,
        cs.work_start,cs.work_end,cs.late_tolerance_minutes,cs.require_selfie,cs.overtime_enabled,
        cs.office_latitude,cs.office_longitude,cs.allowed_radius_meters,cs.radius_lock_enabled,
        cs.wa_api_url,cs.wa_device_number
       FROM users u JOIN companies c ON u.company_id=c.id LEFT JOIN company_settings cs ON cs.company_id=c.id WHERE u.id=$1`, [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    const data = result.rows[0];
    // Don't expose sensitive wa_api_token
    data.wa_configured = !!data.wa_api_url;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Change Password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Password saat ini dan password baru wajib diisi.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    // Get user with current password
    const result = await query('SELECT id, password FROM users WHERE id=$1', [req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const user = result.rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Password saat ini salah.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password
    await query('UPDATE users SET password=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [hashedPassword, req.user.userId]);

    res.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
