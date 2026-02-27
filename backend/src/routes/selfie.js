const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { sendWA, formatCheckIn, formatCheckOut, formatLateAlert } = require('../helpers/whatsapp');

/*
  EXACT DB: attendance
  id, employee_id, company_id, check_in, check_out, date, status,
  latitude, longitude, location_name, location_detail,
  checkout_latitude, checkout_longitude, checkout_location_name,
  selfie_checkin_url, selfie_checkout_url, selfie_verified,
  overtime_minutes, note, created_at, distance_meters, is_within_radius
*/

router.use(authenticate);

// CHECK-IN
router.post('/check-in', async (req, res) => {
  const L = `[CHECKIN][${Date.now().toString(36)}]`;
  console.log(`\n${L} === START ===`);

  try {
    const { employee_id, selfie_data, latitude, longitude, location_address } = req.body;
    const companyId = req.user.companyId;

    if (!employee_id) return res.status(400).json({ success: false, message: 'Employee ID diperlukan.' });

    // Get employee - use phone_number column
    const emp = await query(
      'SELECT * FROM employees WHERE id=$1 AND company_id=$2 AND is_active=true',
      [employee_id, companyId]
    );
    if (!emp.rows.length) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    const e = emp.rows[0];
    const empPhone = e.phone_number || '';
    console.log(`${L} ${e.name} | phone_number: "${empPhone}"`);

    // Settings
    const stg = await query('SELECT * FROM company_settings WHERE company_id=$1', [companyId]);
    const cfg = stg.rows[0] || {};

    // Already checked in?
    const today = new Date().toISOString().split('T')[0];
    const exist = await query(
      'SELECT * FROM attendance WHERE employee_id=$1 AND date=$2',
      [employee_id, today]
    );
    if (exist.rows.length > 0 && exist.rows[0].check_in) {
      return res.status(400).json({ success: false, message: 'Sudah absen masuk hari ini.' });
    }

    // Radius check - use office_latitude/office_longitude from settings
    let distMeters = null;
    let withinRadius = null;
    if (cfg.radius_lock_enabled && cfg.office_latitude && cfg.office_longitude && latitude && longitude) {
      distMeters = Math.round(calcDist(
        parseFloat(cfg.office_latitude), parseFloat(cfg.office_longitude),
        parseFloat(latitude), parseFloat(longitude)
      ));
      const maxR = cfg.allowed_radius_meters || 500;
      withinRadius = distMeters <= maxR;
      console.log(`${L} Distance: ${distMeters}m / max ${maxR}m = ${withinRadius ? 'OK' : 'OUT'}`);
      if (!withinRadius) {
        return res.status(400).json({
          success: false,
          message: `Di luar radius kantor. Jarak: ${distMeters}m, Max: ${maxR}m`
        });
      }
    }

    // Save selfie
    let selfieUrl = null;
    if (selfie_data) {
      selfieUrl = saveSelfie(selfie_data, employee_id, 'in');
      console.log(`${L} Selfie: ${selfieUrl ? 'saved' : 'failed'}`);
    }

    // Late check
    const now = new Date();
    const jak = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const timeStr = jak.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let status = 'hadir';

    if (cfg.work_start) {
      const [wh, wm] = String(cfg.work_start).split(':').map(Number);
      const tol = cfg.late_tolerance_minutes || 15;
      const limit = new Date(jak);
      limit.setHours(wh, wm + tol, 0, 0);
      if (jak > limit) status = 'terlambat';
      console.log(`${L} ${timeStr} vs ${wh}:${String(wm+tol).padStart(2,'0')} → ${status}`);
    }

    // INSERT into attendance with EXACT columns
    let att;
    if (exist.rows.length > 0) {
      att = await query(
        `UPDATE attendance SET
          check_in=CURRENT_TIMESTAMP, status=$1,
          latitude=$2, longitude=$3, location_name=$4,
          selfie_checkin_url=$5, distance_meters=$6, is_within_radius=$7
         WHERE id=$8 RETURNING *`,
        [status, latitude||null, longitude||null, location_address||null,
         selfieUrl, distMeters, withinRadius, exist.rows[0].id]
      );
    } else {
      att = await query(
        `INSERT INTO attendance
          (employee_id, company_id, date, check_in, status,
           latitude, longitude, location_name,
           selfie_checkin_url, distance_meters, is_within_radius)
         VALUES ($1,$2,$3,CURRENT_TIMESTAMP,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [employee_id, companyId, today, status,
         latitude||null, longitude||null, location_address||null,
         selfieUrl, distMeters, withinRadius]
      );
    }

    console.log(`${L} ✅ Saved ID=${att.rows[0].id} status=${status}`);

    // WA notification
    if (empPhone) {
      console.log(`${L} WA → ${empPhone}`);
      sendWA(companyId, empPhone, formatCheckIn(e.name, timeStr, status === 'terlambat' ? 'late' : 'present', location_address))
        .then(r => console.log(`${L} WA: ${JSON.stringify(r)}`))
        .catch(er => console.error(`${L} WA err: ${er.message}`));

      // Late alert to admin
      if (status === 'terlambat') {
        query(
          "SELECT id, name, phone FROM users WHERE company_id=$1 AND role IN('admin','owner') AND phone IS NOT NULL AND phone!=''",
          [companyId]
        ).then(ar => {
          ar.rows.forEach(a => {
            sendWA(companyId, a.phone, formatLateAlert(e.name, timeStr)).catch(() => {});
          });
        }).catch(() => {});
      }
    } else {
      console.log(`${L} ⚠️ No phone_number`);
    }

    console.log(`${L} === DONE ===\n`);
    res.json({
      success: true,
      message: `Absen masuk! ${status === 'terlambat' ? '⚠️ Terlambat' : '✅ Tepat waktu'} (${timeStr})`,
      data: att.rows[0]
    });
  } catch (err) {
    console.error(`${L} 💥`, err);
    res.status(500).json({ success: false, message: 'Gagal: ' + err.message });
  }
});

// CHECK-OUT
router.post('/check-out', async (req, res) => {
  const L = `[CHECKOUT][${Date.now().toString(36)}]`;
  try {
    const { employee_id, selfie_data, latitude, longitude, location_address } = req.body;
    const companyId = req.user.companyId;
    if (!employee_id) return res.status(400).json({ success: false, message: 'Employee ID diperlukan.' });

    const emp = await query('SELECT * FROM employees WHERE id=$1 AND company_id=$2 AND is_active=true', [employee_id, companyId]);
    if (!emp.rows.length) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    const e = emp.rows[0];
    const empPhone = e.phone_number || '';

    const cfg = (await query('SELECT * FROM company_settings WHERE company_id=$1', [companyId])).rows[0] || {};

    const today = new Date().toISOString().split('T')[0];
    const exist = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=$2', [employee_id, today]);
    if (!exist.rows.length || !exist.rows[0].check_in) return res.status(400).json({ success: false, message: 'Belum absen masuk.' });
    if (exist.rows[0].check_out) return res.status(400).json({ success: false, message: 'Sudah absen pulang.' });

    // Radius
    if (cfg.radius_lock_enabled && cfg.office_latitude && cfg.office_longitude && latitude && longitude) {
      const dist = calcDist(parseFloat(cfg.office_latitude), parseFloat(cfg.office_longitude), parseFloat(latitude), parseFloat(longitude));
      if (dist > (cfg.allowed_radius_meters || 500)) {
        return res.status(400).json({ success: false, message: `Di luar radius. Jarak: ${Math.round(dist)}m` });
      }
    }

    let selfieUrl = selfie_data ? saveSelfie(selfie_data, employee_id, 'out') : null;

    // Calculate overtime_minutes
    const checkInTime = new Date(exist.rows[0].check_in);
    const checkOutTime = new Date();
    const totalMinutes = Math.floor((checkOutTime - checkInTime) / 60000);
    let overtimeMinutes = 0;

    if (cfg.overtime_enabled && cfg.work_end) {
      const [eh, em] = String(cfg.work_end).split(':').map(Number);
      const jakNow = new Date(checkOutTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const endTime = new Date(jakNow);
      endTime.setHours(eh, em, 0, 0);
      const otMin = Math.floor((jakNow - endTime) / 60000);
      if (otMin > 0) overtimeMinutes = otMin;
    }

    // UPDATE with EXACT columns
    const att = await query(
      `UPDATE attendance SET
        check_out=CURRENT_TIMESTAMP,
        checkout_latitude=$1, checkout_longitude=$2, checkout_location_name=$3,
        selfie_checkout_url=$4, overtime_minutes=$5
       WHERE id=$6 RETURNING *`,
      [latitude||null, longitude||null, location_address||null,
       selfieUrl, overtimeMinutes, exist.rows[0].id]
    );

    console.log(`${L} ✅ Checkout. Duration: ${totalMinutes}min OT: ${overtimeMinutes}min`);

    // Insert overtime record if significant
    if (overtimeMinutes >= (cfg.overtime_min_minutes || 30)) {
      try {
        await query(
          `INSERT INTO overtime (employee_id, company_id, attendance_id, date, duration_minutes, status, type, reason)
           VALUES ($1,$2,$3,$4,$5,'pending','auto',$6)`,
          [employee_id, companyId, exist.rows[0].id, today, overtimeMinutes, `Auto: ${overtimeMinutes} menit lembur`]
        );
        console.log(`${L} OT record created: ${overtimeMinutes}min`);
      } catch (oe) { console.log(`${L} OT skip: ${oe.message}`); }
    }

    // WA
    const timeStr = checkOutTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    if (empPhone) {
      sendWA(companyId, empPhone, formatCheckOut(e.name, timeStr, totalMinutes, location_address)).catch(() => {});
    }

    res.json({
      success: true,
      message: `Absen pulang! Durasi: ${(totalMinutes/60).toFixed(1)} jam`,
      data: att.rows[0]
    });
  } catch (err) {
    console.error(`${L} 💥`, err);
    res.status(500).json({ success: false, message: 'Gagal: ' + err.message });
  }
});

// TODAY
router.get('/today/:employeeId', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const r = await query(
      `SELECT a.*, e.name as employee_name
       FROM attendance a JOIN employees e ON e.id=a.employee_id
       WHERE a.employee_id=$1 AND a.date=$2 AND e.company_id=$3`,
      [req.params.employeeId, today, req.user.companyId]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// IMAGE
router.get('/image/:filename', (req, res) => {
  const fp = path.join(__dirname, '../../uploads/selfies', path.basename(req.params.filename));
  fs.existsSync(fp) ? res.sendFile(fp) : res.status(404).json({ success: false });
});

function saveSelfie(b64, eid, type) {
  try {
    const dir = path.join(__dirname, '../../uploads/selfies');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const f = `${eid}_${type}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(dir, f), buf);
    return `/uploads/selfies/${f}`;
  } catch (e) { console.error('Selfie err:', e.message); return null; }
}

function calcDist(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;
