const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT cs.*, c.name as company_name, c.logo_url, c.address as company_address, c.phone as company_phone, c.email as company_email, c.plan, c.max_employees
       FROM company_settings cs JOIN companies c ON c.id=cs.company_id WHERE cs.company_id=$1`, [req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Settings tidak ditemukan.' });
    // Mask WA token
    const data = result.rows[0];
    if (data.wa_api_token) data.wa_api_token = data.wa_api_token.substring(0, 8) + '***';
    res.json({ success: true, data });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/', async (req, res) => {
  try {
    const { work_start, work_end, late_tolerance_minutes, office_latitude, office_longitude, office_address,
      allowed_radius_meters, radius_lock_enabled, require_selfie, require_location,
      overtime_enabled, overtime_min_minutes, overtime_max_hours,
      wa_api_url, wa_api_token, wa_device_number, timezone,
      company_name, company_address, company_phone, company_email, logo_url } = req.body;

    // Update company_settings
    await query(
      `UPDATE company_settings SET
        work_start=COALESCE($1,work_start), work_end=COALESCE($2,work_end),
        late_tolerance_minutes=COALESCE($3,late_tolerance_minutes),
        office_latitude=$4, office_longitude=$5, office_address=$6,
        allowed_radius_meters=COALESCE($7,allowed_radius_meters),
        radius_lock_enabled=COALESCE($8,radius_lock_enabled),
        require_selfie=COALESCE($9,require_selfie), require_location=COALESCE($10,require_location),
        overtime_enabled=COALESCE($11,overtime_enabled),
        overtime_min_minutes=COALESCE($12,overtime_min_minutes),
        overtime_max_hours=COALESCE($13,overtime_max_hours),
        wa_api_url=$14, wa_api_token=CASE WHEN $15::text IS NOT NULL AND $15::text != '' AND $15::text NOT LIKE '%***%' THEN $15::text ELSE wa_api_token END,
        wa_device_number=$16, timezone=COALESCE($17,timezone),
        updated_at=CURRENT_TIMESTAMP WHERE company_id=$18`,
      [work_start, work_end, late_tolerance_minutes, office_latitude || null, office_longitude || null,
        office_address || null, allowed_radius_meters, radius_lock_enabled, require_selfie, require_location,
        overtime_enabled, overtime_min_minutes, overtime_max_hours,
        wa_api_url || null, wa_api_token || null, wa_device_number || null, timezone, req.user.companyId]
    );

    // Update company info
    if (company_name || company_address || company_phone || company_email || logo_url !== undefined) {
      await query(
        `UPDATE companies SET name=COALESCE($1,name), address=$2, phone=$3, email=$4, logo_url=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6`,
        [company_name, company_address || null, company_phone || null, company_email || null, logo_url || null, req.user.companyId]
      );
    }

    res.json({ success: true, message: 'Pengaturan berhasil disimpan!' });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Test WA connection
router.post('/test-wa', async (req, res) => {
  try {
    const settings = await query('SELECT wa_api_url, wa_api_token, wa_device_number FROM company_settings WHERE company_id=$1', [req.user.companyId]);
    if (settings.rows.length === 0 || !settings.rows[0].wa_api_url || !settings.rows[0].wa_api_token) {
      return res.json({ success: false, message: 'WA API belum dikonfigurasi.' });
    }
    const fetch = require('node-fetch');
    const deviceUrl = settings.rows[0].wa_api_url.replace('/send', '/device');

    // Try GET first (common for device info endpoint)
    let r = await fetch(deviceUrl, {
      method: 'GET',
      headers: { 'Authorization': settings.rows[0].wa_api_token },
      timeout: 10000,
    });

    // If GET fails with 405, try POST
    if (r.status === 405) {
      r = await fetch(deviceUrl, {
        method: 'POST',
        headers: { 'Authorization': settings.rows[0].wa_api_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        timeout: 10000,
      });
    }

    if (!r.ok) {
      const text = await r.text();
      return res.json({ success: false, message: `HTTP ${r.status}: ${text.substring(0, 200)}` });
    }

    const data = await r.json();
    res.json({ success: true, message: 'Koneksi WA berhasil!', data });
  } catch (error) {
    res.json({ success: false, message: `Gagal terhubung: ${error.message}` });
  }
});

module.exports = router;
