const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

/*
  EXACT DB: company_settings
  id, company_id, work_start, work_end, late_tolerance_minutes,
  allowed_latitude, allowed_longitude, allowed_radius_meters,
  require_location, require_selfie, overtime_enabled,
  overtime_min_minutes, overtime_rate_multiplier, overtime_max_hours,
  created_at, updated_at, office_latitude, office_longitude,
  office_address, radius_lock_enabled,
  wa_api_url, wa_api_token, wa_device_number, timezone
*/

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    await query('INSERT INTO company_settings (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING', [req.user.companyId]);
    const r = await query(
      `SELECT cs.*, c.name as company_name, c.plan, c.max_employees, c.plan_expires_at
       FROM company_settings cs JOIN companies c ON c.id=cs.company_id
       WHERE cs.company_id=$1`,
      [req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false });
    const d = r.rows[0];
    d.has_wa_token = !!d.wa_api_token;
    if (d.wa_api_token) d.wa_api_token = d.wa_api_token.substring(0, 8) + '********';
    res.json({ success: true, data: d });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/', adminOnly, async (req, res) => {
  try {
    const cid = req.user.companyId;
    const b = req.body;
    await query('INSERT INTO company_settings (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING', [cid]);

    const f = []; const v = []; let i = 1;
    const add = (c, val) => { f.push(`${c}=$${i}`); v.push(val); i++; };

    if (b.work_start !== undefined) add('work_start', b.work_start || '08:00');
    if (b.work_end !== undefined) add('work_end', b.work_end || '17:00');
    if (b.late_tolerance_minutes !== undefined) add('late_tolerance_minutes', parseInt(b.late_tolerance_minutes) || 15);
    if (b.require_selfie !== undefined) add('require_selfie', b.require_selfie === true || b.require_selfie === 'true');
    if (b.require_location !== undefined) add('require_location', b.require_location === true || b.require_location === 'true');
    if (b.radius_lock_enabled !== undefined) add('radius_lock_enabled', b.radius_lock_enabled === true || b.radius_lock_enabled === 'true');
    if (b.overtime_enabled !== undefined) add('overtime_enabled', b.overtime_enabled === true || b.overtime_enabled === 'true');
    if (b.overtime_min_minutes !== undefined) add('overtime_min_minutes', parseInt(b.overtime_min_minutes) || 30);
    if (b.overtime_max_hours !== undefined) add('overtime_max_hours', parseInt(b.overtime_max_hours) || 4);
    if (b.office_latitude !== undefined) add('office_latitude', b.office_latitude ? parseFloat(b.office_latitude) : null);
    if (b.office_longitude !== undefined) add('office_longitude', b.office_longitude ? parseFloat(b.office_longitude) : null);
    if (b.office_address !== undefined) add('office_address', b.office_address || null);
    if (b.allowed_radius_meters !== undefined) add('allowed_radius_meters', parseInt(b.allowed_radius_meters) || 500);
    if (b.wa_api_url !== undefined) add('wa_api_url', b.wa_api_url || null);
    if (b.wa_device_number !== undefined) add('wa_device_number', b.wa_device_number || null);
    if (b.wa_api_token && !b.wa_api_token.includes('*')) add('wa_api_token', b.wa_api_token.trim());

    if (!f.length) return res.status(400).json({ success: false, message: 'Tidak ada data' });
    f.push('updated_at=CURRENT_TIMESTAMP');
    v.push(cid);
    await query(`UPDATE company_settings SET ${f.join(',')} WHERE company_id=$${i}`, v);
    res.json({ success: true, message: 'Tersimpan!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/test-wa', adminOnly, async (req, res) => {
  try {
    const s = await query('SELECT wa_api_url, wa_api_token, wa_device_number FROM company_settings WHERE company_id=$1', [req.user.companyId]);
    if (!s.rows.length || !s.rows[0].wa_api_url || !s.rows[0].wa_api_token) {
      return res.status(400).json({ success: false, message: 'WA belum dikonfigurasi.' });
    }
    const { sendWA } = require('../helpers/whatsapp');
    const target = s.rows[0].wa_device_number || '628123456789';
    const r = await sendWA(req.user.companyId, target,
      `✅ *Test WA Absenin*\n\nKoneksi OK!\n${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n_Absenin_`);
    if (r.success) res.json({ success: true, message: `Terkirim ke ${target}!` });
    else res.status(400).json({ success: false, message: 'Gagal: ' + (r.reason || JSON.stringify(r.data)) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
