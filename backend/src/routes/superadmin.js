const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
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
    const recentCompanies = await query('SELECT c.*, (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count FROM companies c ORDER BY c.created_at DESC LIMIT 10');
    const recentPayments = await query("SELECT p.*, c.name as company_name FROM payments p JOIN companies c ON c.id=p.company_id ORDER BY p.created_at DESC LIMIT 10");

    res.json({
      success: true, data: {
        totalCompanies: parseInt(companies.rows[0].total), activeCompanies: parseInt(companies.rows[0].active),
        totalUsers: parseInt(users.rows[0].count), totalEmployees: parseInt(employees.rows[0].count),
        todayAttendance: parseInt(todayAtt.rows[0].count), pendingPayments: parseInt(pendingPayments.rows[0].count),
        monthlyRevenue: parseFloat(revenue.rows[0].total), recentCompanies: recentCompanies.rows, recentPayments: recentPayments.rows,
      }
    });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ======= COMPANIES =======
router.get('/companies', async (req, res) => {
  try {
    const { search, plan, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count,
      (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) as user_count FROM companies c WHERE 1=1`;
    const params = []; let pi = 1;
    if (search) { sql += ` AND c.name ILIKE $${pi}`; params.push(`%${search}%`); pi++; }
    if (plan) { sql += ` AND c.plan=$${pi}`; params.push(plan); pi++; }
    sql += ` ORDER BY c.created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`; params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/companies/:id', async (req, res) => {
  try {
    const { is_active, plan, max_employees, plan_expires_at } = req.body;
    const result = await query(
      'UPDATE companies SET is_active=COALESCE($1,is_active), plan=COALESCE($2,plan), max_employees=COALESCE($3,max_employees), plan_expires_at=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *',
      [is_active, plan, max_employees, plan_expires_at || null, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: result.rows[0] });
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
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT p.*, c.name as company_name, pl.name as plan_name FROM payments p 
      JOIN companies c ON c.id=p.company_id LEFT JOIN plans pl ON pl.id=p.plan_id WHERE 1=1`;
    const params = []; let pi = 1;
    if (status) { sql += ` AND p.status=$${pi}`; params.push(status); pi++; }
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

    // Update payment
    await query('UPDATE payments SET status=\'confirmed\', confirmed_by=$1, confirmed_at=CURRENT_TIMESTAMP WHERE id=$2', [req.user.userId, req.params.id]);

    // Upgrade company
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

module.exports = router;
