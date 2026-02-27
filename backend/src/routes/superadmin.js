const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/db');
const { authenticate, superadminOnly } = require('../middleware/auth');

router.use(authenticate, superadminOnly);

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [co, us, em, att, pp, rev] = await Promise.all([
      query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM companies'),
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM employees WHERE is_active=true'),
      query('SELECT COUNT(*) FROM attendance WHERE date=CURRENT_DATE AND check_in IS NOT NULL'),
      query("SELECT COUNT(*) FROM payments WHERE status IN ('pending','waiting_confirmation')"),
      query("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status='confirmed' AND EXTRACT(MONTH FROM confirmed_at)=EXTRACT(MONTH FROM CURRENT_DATE)"),
    ]);
    const rc = await query(`SELECT c.*, (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count, (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) as user_count FROM companies c ORDER BY c.created_at DESC LIMIT 10`);
    const rp = await query(`SELECT p.*, c.name as company_name, pl.name as plan_name FROM payments p JOIN companies c ON c.id=p.company_id LEFT JOIN plans pl ON pl.id=p.plan_id ORDER BY p.created_at DESC LIMIT 10`);

    res.json({ success: true, data: {
      totalCompanies: parseInt(co.rows[0].total), activeCompanies: parseInt(co.rows[0].active),
      totalUsers: parseInt(us.rows[0].count), totalEmployees: parseInt(em.rows[0].count),
      todayAttendance: parseInt(att.rows[0].count), pendingPayments: parseInt(pp.rows[0].count),
      monthlyRevenue: parseFloat(rev.rows[0].total), recentCompanies: rc.rows, recentPayments: rp.rows,
    }});
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// List companies
router.get('/companies', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const params = []; const cond = []; let pi = 1;
    if (search) { cond.push(`(c.name ILIKE $${pi} OR c.slug ILIKE $${pi} OR c.email ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    params.push(parseInt(limit)); const lp = pi; pi++;
    params.push((parseInt(page) - 1) * parseInt(limit)); const op = pi;
    const r = await query(`SELECT c.*, (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count, (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) as user_count, cs.require_selfie, cs.radius_lock_enabled, cs.overtime_enabled, cs.wa_api_url FROM companies c LEFT JOIN company_settings cs ON cs.company_id=c.id ${where} ORDER BY c.created_at DESC LIMIT $${lp} OFFSET $${op}`, params);
    const cnt = await query('SELECT COUNT(*) FROM companies');
    res.json({ success: true, data: r.rows, pagination: { total: parseInt(cnt.rows[0].count), page: parseInt(page) } });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// Get single company
router.get('/companies/:id', async (req, res) => {
  try {
    const r = await query(`SELECT c.id, c.name, c.slug, c.plan, c.max_employees, c.is_active, c.plan_expires_at, c.created_at, c.address, c.phone, c.email, c.logo_url, cs.work_start, cs.work_end, cs.late_tolerance_minutes, cs.require_selfie, cs.require_location, cs.radius_lock_enabled, cs.overtime_enabled, cs.overtime_min_minutes, cs.overtime_max_hours, cs.office_latitude, cs.office_longitude, cs.office_address, cs.allowed_radius_meters, cs.wa_api_url, cs.wa_api_token, cs.wa_device_number, (SELECT COUNT(*) FROM employees e WHERE e.company_id=c.id AND e.is_active=true) as emp_count, (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) as user_count FROM companies c LEFT JOIN company_settings cs ON cs.company_id=c.id WHERE c.id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    const d = r.rows[0];
    const users = await query('SELECT id, email, name, role, phone, is_active, last_login, created_at FROM users WHERE company_id=$1 ORDER BY created_at', [req.params.id]);
    d.users = users.rows;
    d.has_wa_token = !!d.wa_api_token;
    if (d.wa_api_token) d.wa_api_token_display = d.wa_api_token.substring(0, 8) + '********';
    delete d.wa_api_token;
    res.json({ success: true, data: d });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// Update company
router.put('/companies/:id', async (req, res) => {
  try {
    const cid = req.params.id;
    const b = req.body;

    // Companies table
    const cf = []; const cv = []; let ci = 1;
    const ac = (col, val) => { cf.push(`${col}=$${ci}`); cv.push(val); ci++; };
    if (b.name !== undefined) ac('name', b.name);
    if (b.is_active !== undefined) ac('is_active', b.is_active === true || b.is_active === 'true');
    if (b.plan !== undefined) ac('plan', b.plan);
    if (b.max_employees !== undefined) ac('max_employees', parseInt(b.max_employees) || 10);
    if (b.address !== undefined) ac('address', b.address || null);
    if (b.phone !== undefined) ac('phone', b.phone || null);
    if (b.email !== undefined) ac('email', b.email || null);
    if (b.logo_url !== undefined) ac('logo_url', b.logo_url || null);

    if (cf.length > 0) {
      cf.push('updated_at=CURRENT_TIMESTAMP');
      cv.push(cid);
      await query(`UPDATE companies SET ${cf.join(', ')} WHERE id=$${ci}`, cv);
    }

    // Settings table
    const sf = []; const sv = []; let si = 1;
    const as2 = (col, val) => { sf.push(`${col}=$${si}`); sv.push(val); si++; };
    if (b.work_start !== undefined) as2('work_start', b.work_start || '08:00');
    if (b.work_end !== undefined) as2('work_end', b.work_end || '17:00');
    if (b.late_tolerance_minutes !== undefined) as2('late_tolerance_minutes', parseInt(b.late_tolerance_minutes) || 15);
    if (b.require_selfie !== undefined) as2('require_selfie', b.require_selfie === true || b.require_selfie === 'true');
    if (b.require_location !== undefined) as2('require_location', b.require_location === true || b.require_location === 'true');
    if (b.radius_lock_enabled !== undefined) as2('radius_lock_enabled', b.radius_lock_enabled === true || b.radius_lock_enabled === 'true');
    if (b.overtime_enabled !== undefined) as2('overtime_enabled', b.overtime_enabled === true || b.overtime_enabled === 'true');
    if (b.overtime_min_minutes !== undefined) as2('overtime_min_minutes', parseInt(b.overtime_min_minutes) || 30);
    if (b.overtime_max_hours !== undefined) as2('overtime_max_hours', parseInt(b.overtime_max_hours) || 4);
    if (b.office_latitude !== undefined) as2('office_latitude', b.office_latitude ? parseFloat(b.office_latitude) : null);
    if (b.office_longitude !== undefined) as2('office_longitude', b.office_longitude ? parseFloat(b.office_longitude) : null);
    if (b.office_address !== undefined) as2('office_address', b.office_address || null);
    if (b.allowed_radius_meters !== undefined) as2('allowed_radius_meters', parseInt(b.allowed_radius_meters) || 500);
    if (b.wa_api_url !== undefined) as2('wa_api_url', b.wa_api_url || null);
    if (b.wa_device_number !== undefined) as2('wa_device_number', b.wa_device_number || null);
    if (b.wa_api_token && b.wa_api_token.trim() !== '' && !b.wa_api_token.includes('*')) {
      as2('wa_api_token', b.wa_api_token);
    }

    if (sf.length > 0) {
      await query('INSERT INTO company_settings (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING', [cid]);
      sf.push('updated_at=CURRENT_TIMESTAMP');
      sv.push(cid);
      await query(`UPDATE company_settings SET ${sf.join(', ')} WHERE company_id=$${si}`, sv);
    }

    res.json({ success: true, message: 'Perusahaan berhasil diupdate!' });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// Create company
router.post('/companies', async (req, res) => {
  try {
    const { name, email, plan, max_employees, admin_name, admin_email, admin_password, admin_phone } = req.body;
    if (!name || !admin_email || !admin_password) return res.status(400).json({ success: false, message: 'Nama, email admin, password wajib.' });
    if (admin_password.length < 6) return res.status(400).json({ success: false, message: 'Password min 6 karakter.' });

    const result = await transaction(async (client) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
      const c = await client.query('INSERT INTO companies (name,slug,plan,max_employees,email) VALUES ($1,$2,$3,$4,$5) RETURNING *', [name, slug, plan || 'free', parseInt(max_employees) || 10, email || null]);
      const hp = await bcrypt.hash(admin_password, 12);
      const u = await client.query('INSERT INTO users (email,password,name,phone,role,company_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,email,name,role', [admin_email, hp, admin_name || admin_email.split('@')[0], admin_phone || null, 'admin', c.rows[0].id]);
      await client.query('INSERT INTO company_settings (company_id) VALUES ($1)', [c.rows[0].id]);
      return { company: c.rows[0], user: u.rows[0] };
    });
    res.status(201).json({ success: true, message: 'Perusahaan dibuat!', data: result });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ success: false, message: 'Email sudah ada.' });
    console.error(e); res.status(500).json({ success: false, message: e.message });
  }
});

// Delete company (cascade)
router.delete('/companies/:id', async (req, res) => {
  try {
    const cid = req.params.id;
    if (cid === '1') return res.status(400).json({ success: false, message: 'Tidak bisa hapus perusahaan utama.' });
    const ch = await query('SELECT name FROM companies WHERE id=$1', [cid]);
    if (!ch.rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    const name = ch.rows[0].name;

    await transaction(async (client) => {
      const emps = await client.query('SELECT id FROM employees WHERE company_id=$1', [cid]);
      const ids = emps.rows.map(e => e.id);
      if (ids.length > 0) {
        await client.query('DELETE FROM attendance WHERE employee_id = ANY($1)', [ids]);
        await client.query('DELETE FROM overtime WHERE employee_id = ANY($1)', [ids]);
        await client.query('DELETE FROM leaves WHERE employee_id = ANY($1)', [ids]);
      }
      await client.query('DELETE FROM employees WHERE company_id=$1', [cid]);
      await client.query('DELETE FROM positions WHERE company_id=$1', [cid]);
      await client.query('DELETE FROM divisions WHERE company_id=$1', [cid]);
      await client.query('DELETE FROM users WHERE company_id=$1', [cid]);
      await client.query('DELETE FROM company_settings WHERE company_id=$1', [cid]);
      await client.query('DELETE FROM payments WHERE company_id=$1', [cid]);
      await client.query('DELETE FROM companies WHERE id=$1', [cid]);
    });
    res.json({ success: true, message: `"${name}" berhasil dihapus.` });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// Test Fonnte per company
router.post('/companies/:id/test-wa', async (req, res) => {
  try {
    const cid = req.params.id;
    let { wa_api_url, wa_api_token, wa_device_number, test_number } = req.body;

    if (!wa_api_token || wa_api_token.includes('*')) {
      const s = await query('SELECT wa_api_url, wa_api_token, wa_device_number FROM company_settings WHERE company_id=$1', [cid]);
      if (s.rows.length) {
        if (!wa_api_token || wa_api_token.includes('*')) wa_api_token = s.rows[0].wa_api_token;
        if (!wa_api_url) wa_api_url = s.rows[0].wa_api_url;
        if (!wa_device_number) wa_device_number = s.rows[0].wa_device_number;
      }
    }
    if (!wa_api_url || !wa_api_token) return res.status(400).json({ success: false, message: 'URL & Token Fonnte belum diisi. Simpan dulu.' });

    const target = test_number || wa_device_number || '6281234567890';
    const fetch = require('node-fetch');
    const resp = await fetch(wa_api_url, {
      method: 'POST',
      headers: { 'Authorization': wa_api_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, message: `✅ Test WA Absenin\nBerhasil!\n${new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}`, countryCode: '62' }),
    });
    const result = await resp.json();
    if (result.status === true || result.process === 'processing') {
      res.json({ success: true, message: `Pesan dikirim ke ${target}!` });
    } else {
      res.status(400).json({ success: false, message: `Fonnte: ${result.reason || result.detail || JSON.stringify(result)}` });
    }
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: e.message }); }
});

// Users
router.get('/users', async (req, res) => {
  try {
    const { company_id, search } = req.query;
    const p = []; const c = []; let pi = 1;
    if (company_id) { c.push(`u.company_id=$${pi}`); p.push(company_id); pi++; }
    if (search) { c.push(`(u.name ILIKE $${pi} OR u.email ILIKE $${pi})`); p.push(`%${search}%`); pi++; }
    const w = c.length ? 'WHERE '+c.join(' AND ') : '';
    const r = await query(`SELECT u.id,u.email,u.name,u.phone,u.role,u.is_active,u.company_id,u.last_login,u.created_at,c.name as company_name FROM users u LEFT JOIN companies c ON c.id=u.company_id ${w} ORDER BY u.created_at DESC`, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/users/:id/password', async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ success: false, message: 'Min 6 karakter.' });
    const hp = await bcrypt.hash(new_password, 12);
    const r = await query('UPDATE users SET password=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id,name', [hp, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: `Password ${r.rows[0].name} diubah!` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/users/:id/toggle', async (req, res) => {
  try {
    const r = await query('UPDATE users SET is_active=NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id,name,is_active', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: `${r.rows[0].name} ${r.rows[0].is_active?'aktif':'nonaktif'}.`, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Plans
router.get('/plans', async (req, res) => { try { const r = await query('SELECT * FROM plans ORDER BY sort_order,id'); res.json({ success: true, data: r.rows }); } catch(e) { res.status(500).json({ success: false, message: e.message }); } });
router.post('/plans', async (req, res) => { try { const {name,slug,price,max_employees,duration_days,description,sort_order} = req.body; if(!name||!slug) return res.status(400).json({success:false,message:'Nama & slug wajib.'}); const r = await query('INSERT INTO plans (name,slug,price,max_employees,duration_days,description,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [name,slug,parseFloat(price)||0,parseInt(max_employees)||10,parseInt(duration_days)||30,description||'',parseInt(sort_order)||0]); res.status(201).json({success:true,data:r.rows[0]}); } catch(e) { if(e.code==='23505') return res.status(400).json({success:false,message:'Slug ada.'}); res.status(500).json({success:false,message:e.message}); } });
router.delete('/plans/:id', async (req, res) => { try { await query('DELETE FROM plans WHERE id=$1', [req.params.id]); res.json({ success: true, message: 'Dihapus.' }); } catch(e) { res.status(500).json({ success: false, message: e.message }); } });

// Banks
router.get('/banks', async (req, res) => { try { const r = await query('SELECT * FROM bank_accounts ORDER BY sort_order,id'); res.json({ success: true, data: r.rows }); } catch(e) { res.status(500).json({ success: false, message: e.message }); } });
router.post('/banks', async (req, res) => { try { const {bank_name,account_number,account_name} = req.body; if(!bank_name||!account_number||!account_name) return res.status(400).json({success:false,message:'Semua field wajib.'}); const r = await query('INSERT INTO bank_accounts (bank_name,account_number,account_name) VALUES ($1,$2,$3) RETURNING *', [bank_name,account_number,account_name]); res.status(201).json({success:true,data:r.rows[0]}); } catch(e) { res.status(500).json({success:false,message:e.message}); } });
router.delete('/banks/:id', async (req, res) => { try { await query('DELETE FROM bank_accounts WHERE id=$1', [req.params.id]); res.json({ success: true, message: 'Dihapus.' }); } catch(e) { res.status(500).json({ success: false, message: e.message }); } });

// Payments
router.get('/payments', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const p = []; const c = []; let pi = 1;
    if (status) { c.push(`p.status=$${pi}`); p.push(status); pi++; }
    const w = c.length ? 'WHERE '+c.join(' AND ') : '';
    p.push(parseInt(limit)); const lp = pi; pi++;
    p.push((parseInt(page)-1)*parseInt(limit)); const op = pi;
    const r = await query(`SELECT p.*,c.name as company_name,pl.name as plan_name FROM payments p JOIN companies c ON c.id=p.company_id LEFT JOIN plans pl ON pl.id=p.plan_id ${w} ORDER BY p.created_at DESC LIMIT $${lp} OFFSET $${op}`, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/payments/:id/confirm', async (req, res) => {
  try {
    const pay = await query('SELECT * FROM payments WHERE id=$1', [req.params.id]);
    if (!pay.rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    await query("UPDATE payments SET status='confirmed',confirmed_by=$1,confirmed_at=CURRENT_TIMESTAMP WHERE id=$2", [req.user.userId, req.params.id]);
    const p = pay.rows[0];
    if (p.plan_id) {
      const pl = await query('SELECT * FROM plans WHERE id=$1', [p.plan_id]);
      if (pl.rows.length) { const x = new Date(); x.setDate(x.getDate()+(pl.rows[0].duration_days||30)); await query('UPDATE companies SET plan=$1,max_employees=$2,plan_expires_at=$3,is_active=true WHERE id=$4', [pl.rows[0].slug,pl.rows[0].max_employees,x,p.company_id]); }
    }
    res.json({ success: true, message: 'Dikonfirmasi!' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/payments/:id/reject', async (req, res) => {
  try {
    const r = await query("UPDATE payments SET status='rejected',confirmed_by=$1,confirmed_at=CURRENT_TIMESTAMP,rejection_reason=$2 WHERE id=$3 RETURNING *", [req.user.userId, req.body.reason||'Ditolak', req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: 'Ditolak.' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
