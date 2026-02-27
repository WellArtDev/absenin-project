const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/db');
const { authenticate, superadminOnly } = require('../middleware/auth');
router.use(authenticate, superadminOnly);

// ======= DASHBOARD =======
router.get('/dashboard', async (req, res) => {
  try {
    const companies = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM companies');
    const users = await query('SELECT COUNT(*) FROM users');
    const employees = await query('SELECT COUNT(*) FROM employees WHERE is_active=true');
    const todayAtt = await query('SELECT COUNT(*) FROM attendance WHERE date=CURRENT_DATE AND check_in IS NOT NULL');
    const pendingPayments = await query("SELECT COUNT(*) FROM payments WHERE status IN ('pending','waiting_confirmation')");
    const revenue = await query("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='confirmed' AND EXTRACT(MONTH FROM confirmed_at)=EXTRACT(MONTH FROM CURRENT_DATE)");
    const recentCompanies = await query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count,
        (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) as user_count
      FROM companies c ORDER BY c.created_at DESC LIMIT 10`);
    const recentPayments = await query("SELECT p.*, c.name as company_name, pl.name as plan_name FROM payments p JOIN companies c ON c.id=p.company_id LEFT JOIN plans pl ON pl.id=p.plan_id ORDER BY p.created_at DESC LIMIT 10");

    res.json({
      success: true, data: {
        totalCompanies: parseInt(companies.rows[0].total),
        activeCompanies: parseInt(companies.rows[0].active),
        totalUsers: parseInt(users.rows[0].count),
        totalEmployees: parseInt(employees.rows[0].count),
        todayAttendance: parseInt(todayAtt.rows[0].count),
        pendingPayments: parseInt(pendingPayments.rows[0].count),
        monthlyRevenue: parseFloat(revenue.rows[0].total),
        recentCompanies: recentCompanies.rows,
        recentPayments: recentPayments.rows,
      }
    });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ======= COMPANIES (Full CRUD) =======
router.get('/companies', async (req, res) => {
  try {
    const { search, plan, is_active, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT c.*, 
      (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count,
      (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) as user_count,
      cs.require_selfie, cs.radius_lock_enabled, cs.overtime_enabled,
      cs.wa_api_url, cs.wa_device_number
      FROM companies c
      LEFT JOIN company_settings cs ON cs.company_id=c.id
      WHERE 1=1`;
    const params = []; let pi = 1;
    if (search) { sql += ` AND (c.name ILIKE $${pi} OR c.slug ILIKE $${pi} OR c.email ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
    if (plan) { sql += ` AND c.plan=$${pi}`; params.push(plan); pi++; }
    if (is_active !== undefined && is_active !== '') { sql += ` AND c.is_active=$${pi}`; params.push(is_active === 'true'); pi++; }
    sql += ` ORDER BY c.created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`; params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    const cnt = await query('SELECT COUNT(*) FROM companies');
    res.json({ success: true, data: result.rows, pagination: { total: parseInt(cnt.rows[0].count), page: parseInt(page) } });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Get single company detail
router.get('/companies/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, cs.*,
        (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count,
        (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) as user_count
      FROM companies c
      LEFT JOIN company_settings cs ON cs.company_id=c.id
      WHERE c.id=$1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    
    // Get users of this company
    const users = await query('SELECT id, email, name, role, phone, is_active, last_login, created_at FROM users WHERE company_id=$1 ORDER BY created_at', [req.params.id]);
    
    const data = result.rows[0];
    data.users = users.rows;
    // Mask WA token
    if (data.wa_api_token) data.wa_api_token = data.wa_api_token.substring(0, 8) + '***';
    res.json({ success: true, data });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Update company (full edit)
router.put('/companies/:id', async (req, res) => {
  try {
    const { name, is_active, plan, max_employees, plan_expires_at,
      address, phone, email, logo_url,
      // Settings
      work_start, work_end, late_tolerance_minutes,
      require_selfie, require_location, radius_lock_enabled,
      overtime_enabled, overtime_min_minutes, overtime_max_hours,
      office_latitude, office_longitude, office_address, allowed_radius_meters,
      wa_api_url, wa_api_token, wa_device_number
    } = req.body;

    // Update company table
    await query(
      `UPDATE companies SET 
        name=COALESCE($1,name), is_active=COALESCE($2,is_active), plan=COALESCE($3,plan),
        max_employees=COALESCE($4,max_employees), plan_expires_at=$5,
        address=$6, phone=$7, email=$8, logo_url=$9,
        updated_at=CURRENT_TIMESTAMP WHERE id=$10`,
      [name, is_active, plan, max_employees, plan_expires_at || null,
        address !== undefined ? address : null, phone !== undefined ? phone : null,
        email !== undefined ? email : null, logo_url !== undefined ? logo_url : null,
        req.params.id]
    );

    // Update company_settings if any settings provided
    const hasSettings = work_start !== undefined || work_end !== undefined || require_selfie !== undefined ||
      radius_lock_enabled !== undefined || overtime_enabled !== undefined || wa_api_url !== undefined;
    
    if (hasSettings) {
      // Ensure settings row exists
      await query('INSERT INTO company_settings (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING', [req.params.id]);
      
      await query(
        `UPDATE company_settings SET
          work_start=COALESCE($1,work_start), work_end=COALESCE($2,work_end),
          late_tolerance_minutes=COALESCE($3,late_tolerance_minutes),
          require_selfie=COALESCE($4,require_selfie), require_location=COALESCE($5,require_location),
          radius_lock_enabled=COALESCE($6,radius_lock_enabled),
          overtime_enabled=COALESCE($7,overtime_enabled),
          overtime_min_minutes=COALESCE($8,overtime_min_minutes),
          overtime_max_hours=COALESCE($9,overtime_max_hours),
          office_latitude=$10, office_longitude=$11, office_address=$12,
          allowed_radius_meters=COALESCE($13,allowed_radius_meters),
          wa_api_url=$14,
          wa_api_token=CASE WHEN $15 IS NOT NULL AND $15 != '' AND $15 NOT LIKE '%***%' THEN $15 ELSE wa_api_token END,
          wa_device_number=$16,
          updated_at=CURRENT_TIMESTAMP WHERE company_id=$17`,
        [work_start, work_end, late_tolerance_minutes,
          require_selfie, require_location, radius_lock_enabled,
          overtime_enabled, overtime_min_minutes, overtime_max_hours,
          office_latitude || null, office_longitude || null, office_address || null,
          allowed_radius_meters,
          wa_api_url || null, wa_api_token || null, wa_device_number || null,
          req.params.id]
      );
    }

    res.json({ success: true, message: 'Perusahaan berhasil diupdate!' });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Create new company (superadmin can create)
router.post('/companies', async (req, res) => {
  try {
    const { name, email, plan, max_employees, admin_name, admin_email, admin_password, admin_phone } = req.body;
    if (!name || !admin_email || !admin_password) {
      return res.status(400).json({ success: false, message: 'Nama perusahaan, email admin, dan password diperlukan.' });
    }

    const result = await transaction(async (client) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const c = await client.query(
        'INSERT INTO companies (name,slug,plan,max_employees) VALUES ($1,$2,$3,$4) RETURNING *',
        [name, `${slug}-${Date.now()}`, plan || 'free', max_employees || 10]);
      const cid = c.rows[0].id;
      
      const hp = await bcrypt.hash(admin_password, 12);
      const u = await client.query(
        'INSERT INTO users (email,password,name,phone,role,company_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,email,name,role',
        [admin_email, hp, admin_name || admin_email.split('@')[0], admin_phone || null, 'admin', cid]);
      
      await client.query('INSERT INTO company_settings (company_id) VALUES ($1)', [cid]);
      
      return { company: c.rows[0], user: u.rows[0] };
    });

    res.status(201).json({ success: true, message: 'Perusahaan & admin berhasil dibuat!', data: result });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });
    console.error(error); res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Delete company
router.delete('/companies/:id', async (req, res) => {
  try {
    // Don't allow deleting company id=1 (superadmin company)
    if (req.params.id === '1') return res.status(400).json({ success: false, message: 'Tidak bisa menghapus perusahaan utama.' });
    await query('DELETE FROM companies WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Perusahaan dihapus.' });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ======= USER MANAGEMENT =======
router.get('/users', async (req, res) => {
  try {
    const { company_id, search } = req.query;
    let sql = 'SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.company_id, u.last_login, u.created_at, c.name as company_name FROM users u LEFT JOIN companies c ON c.id=u.company_id WHERE 1=1';
    const params = []; let pi = 1;
    if (company_id) { sql += ` AND u.company_id=$${pi}`; params.push(company_id); pi++; }
    if (search) { sql += ` AND (u.name ILIKE $${pi} OR u.email ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
    sql += ' ORDER BY u.created_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Change user password
router.put('/users/:id/password', async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }
    const hp = await bcrypt.hash(new_password, 12);
    const result = await query('UPDATE users SET password=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, email, name', [hp, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    res.json({ success: true, message: `Password ${result.rows[0].name} berhasil diubah!` });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Toggle user active
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const result = await query('UPDATE users SET is_active=NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id, name, is_active', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: `${result.rows[0].name} ${result.rows[0].is_active ? 'diaktifkan' : 'dinonaktifkan'}.`, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ======= PLANS =======
router.get('/plans', async (req, res) => {
  try {
    const result = await query('SELECT * FROM plans ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/plans', async (req, res) => {
  try {
    const { name, slug, price, max_employees, duration_days, features, description, sort_order } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, message: 'Name & slug required.' });
    const result = await query(
      'INSERT INTO plans (name,slug,price,max_employees,duration_days,features,description,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, slug, price || 0, max_employees || 10, duration_days || 30, JSON.stringify(features || []), description || '', sort_order || 0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Slug sudah ada.' });
    console.error(error); res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const { name, price, max_employees, duration_days, features, description, sort_order, is_active } = req.body;
    const result = await query(
      `UPDATE plans SET name=COALESCE($1,name), price=COALESCE($2,price), max_employees=COALESCE($3,max_employees),
        duration_days=COALESCE($4,duration_days), features=COALESCE($5,features), description=$6,
        sort_order=COALESCE($7,sort_order), is_active=COALESCE($8,is_active), updated_at=CURRENT_TIMESTAMP WHERE id=$9 RETURNING *`,
      [name, price, max_employees, duration_days, features ? JSON.stringify(features) : null, description, sort_order, is_active, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    await query('DELETE FROM plans WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Plan dihapus.' });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ======= BANK ACCOUNTS =======
router.get('/banks', async (req, res) => {
  try {
    const result = await query('SELECT * FROM bank_accounts ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/banks', async (req, res) => {
  try {
    const { bank_name, account_number, account_name, sort_order } = req.body;
    const result = await query('INSERT INTO bank_accounts (bank_name,account_number,account_name,sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [bank_name, account_number, account_name, sort_order || 0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/banks/:id', async (req, res) => {
  try {
    const { bank_name, account_number, account_name, is_active, sort_order } = req.body;
    const result = await query(
      'UPDATE bank_accounts SET bank_name=COALESCE($1,bank_name), account_number=COALESCE($2,account_number), account_name=COALESCE($3,account_name), is_active=COALESCE($4,is_active), sort_order=COALESCE($5,sort_order) WHERE id=$6 RETURNING *',
      [bank_name, account_number, account_name, is_active, sort_order, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/banks/:id', async (req, res) => {
  try {
    await query('DELETE FROM bank_accounts WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Bank dihapus.' });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ======= PAYMENTS =======
router.get('/payments', async (req, res) => {
  try {
    const { status, company_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT p.*, c.name as company_name, pl.name as plan_name FROM payments p 
      JOIN companies c ON c.id=p.company_id LEFT JOIN plans pl ON pl.id=p.plan_id WHERE 1=1`;
    const params = []; let pi = 1;
    if (status) { sql += ` AND p.status=$${pi}`; params.push(status); pi++; }
    if (company_id) { sql += ` AND p.company_id=$${pi}`; params.push(company_id); pi++; }
    sql += ` ORDER BY p.created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`; params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/payments/:id/confirm', async (req, res) => {
  try {
    const payment = await query('SELECT * FROM payments WHERE id=$1', [req.params.id]);
    if (payment.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    const p = payment.rows[0];

    await query('UPDATE payments SET status=\'confirmed\', confirmed_by=$1, confirmed_at=CURRENT_TIMESTAMP WHERE id=$2', [req.user.userId, req.params.id]);

    const plan = await query('SELECT * FROM plans WHERE id=$1', [p.plan_id]);
    if (plan.rows.length > 0) {
      const pl = plan.rows[0];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (pl.duration_days || 30));
      await query('UPDATE companies SET plan=$1, max_employees=$2, plan_expires_at=$3, is_active=true WHERE id=$4',
        [pl.slug, pl.max_employees, expiresAt, p.company_id]);
    }

    res.json({ success: true, message: 'Pembayaran dikonfirmasi & plan diupgrade!' });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/payments/:id/reject', async (req, res) => {
  try {
    const result = await query('UPDATE payments SET status=\'rejected\', confirmed_by=$1, confirmed_at=CURRENT_TIMESTAMP, rejection_reason=$2 WHERE id=$3 RETURNING *',
      [req.user.userId, req.body.reason || 'Ditolak', req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ======= GLOBAL STATS =======
router.get('/stats', async (req, res) => {
  try {
    const monthly = await query(`
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count 
      FROM companies WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month`);
    const planDist = await query('SELECT plan, COUNT(*) FROM companies GROUP BY plan ORDER BY count DESC');
    const topCompanies = await query(`
      SELECT c.name, c.plan, COUNT(e.id) as emp_count,
        (SELECT COUNT(*) FROM attendance a JOIN employees e2 ON a.employee_id=e2.id WHERE e2.company_id=c.id AND a.date=CURRENT_DATE) as today_att
      FROM companies c LEFT JOIN employees e ON e.company_id=c.id AND e.is_active=true
      GROUP BY c.id ORDER BY emp_count DESC LIMIT 10`);
    res.json({ success: true, data: { monthlyGrowth: monthly.rows, planDistribution: planDist.rows, topCompanies: topCompanies.rows } });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
