const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { sendWA, formatCheckIn, formatCheckOut, formatLateAlert, EMP_PHONE_COL, USER_PHONE_COL } = require('../helpers/whatsapp');

const PHONE = EMP_PHONE_COL || 'phone_number';
const UPHONE = USER_PHONE_COL || 'phone';

router.use(authenticate);

// CHECK-IN
router.post('/check-in', async (req, res) => {
  const L = `[CHECKIN][${Date.now().toString(36)}]`;
  console.log(`\n${L} === START ===`);

  try {
    const { employee_id, selfie_data, latitude, longitude, location_address } = req.body;
    const cid = req.user.companyId;

    if (!employee_id) return res.status(400).json({ success: false, message: 'Employee ID diperlukan.' });

    const emp = await query('SELECT * FROM employees WHERE id=$1 AND company_id=$2 AND is_active=true', [employee_id, cid]);
    if (!emp.rows.length) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    const e = emp.rows[0];
    const empPhone = e[PHONE] || e.phone_number || e.phone || '';
    console.log(`${L} Employee: ${e.name} | Phone column '${PHONE}': "${empPhone}"`);

    const settings = await query('SELECT * FROM company_settings WHERE company_id=$1', [cid]);
    const cfg = settings.rows[0] || {};

    const today = new Date().toISOString().split('T')[0];
    const exist = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=$2', [employee_id, today]);
    if (exist.rows.length > 0 && exist.rows[0].check_in) {
      return res.status(400).json({ success: false, message: 'Sudah absen masuk hari ini.' });
    }

    // Radius
    if (cfg.radius_lock_enabled && cfg.office_latitude && cfg.office_longitude && latitude && longitude) {
      const dist = calcDist(parseFloat(cfg.office_latitude), parseFloat(cfg.office_longitude), parseFloat(latitude), parseFloat(longitude));
      const maxR = cfg.allowed_radius_meters || 500;
      if (dist > maxR) return res.status(400).json({ success: false, message: `Di luar radius. Jarak: ${Math.round(dist)}m, Max: ${maxR}m` });
    }

    let selfie = selfie_data ? saveSelfie(selfie_data, employee_id, 'in') : null;

    const now = new Date();
    const jak = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const timeStr = jak.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let status = 'present';

    if (cfg.work_start) {
      const [wh, wm] = cfg.work_start.split(':').map(Number);
      const tol = cfg.late_tolerance_minutes || 15;
      const lim = new Date(jak); lim.setHours(wh, wm + tol, 0, 0);
      if (jak > lim) status = 'late';
    }

    let att;
    if (exist.rows.length > 0) {
      att = await query(
        `UPDATE attendance SET check_in=CURRENT_TIMESTAMP, status=$1, check_in_selfie=$2,
         check_in_latitude=$3, check_in_longitude=$4, check_in_location=$5, updated_at=CURRENT_TIMESTAMP
         WHERE id=$6 RETURNING *`,
        [status, selfie, latitude||null, longitude||null, location_address||null, exist.rows[0].id]
      );
    } else {
      att = await query(
        `INSERT INTO attendance (employee_id, date, check_in, status, check_in_selfie,
         check_in_latitude, check_in_longitude, check_in_location)
         VALUES ($1,$2,CURRENT_TIMESTAMP,$3,$4,$5,$6,$7) RETURNING *`,
        [employee_id, today, status, selfie, latitude||null, longitude||null, location_address||null]
      );
    }

    console.log(`${L} ✅ Saved: ID=${att.rows[0].id} Status=${status}`);

    // WA to employee
    if (empPhone) {
      console.log(`${L} Sending WA to: ${empPhone}`);
      try {
        const r = await sendWA(cid, empPhone, formatCheckIn(e.name, timeStr, status, location_address));
        console.log(`${L} WA result: ${JSON.stringify(r)}`);
      } catch(we) { console.error(`${L} WA error: ${we.message}`); }
    } else {
      console.log(`${L} ⚠️ No phone - column '${PHONE}' is empty`);
    }

    // Late alert to admins
    if (status === 'late') {
      try {
        const admins = await query(
          `SELECT id, name, ${UPHONE} as phone FROM users WHERE company_id=$1 AND role IN('admin','owner','superadmin') AND ${UPHONE} IS NOT NULL AND ${UPHONE} != ''`,
          [cid]
        );
        for (const a of admins.rows) {
          sendWA(cid, a.phone, formatLateAlert(e.name, timeStr)).catch(()=>{});
        }
      } catch(ae) { console.log(`${L} Admin notify skip: ${ae.message}`); }
    }

    console.log(`${L} === DONE ===\n`);
    res.json({ success: true, message: `Absen masuk berhasil! ${status==='late'?'⚠️ Terlambat':'✅ Tepat waktu'} (${timeStr})`, data: att.rows[0] });
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
    const cid = req.user.companyId;
    if (!employee_id) return res.status(400).json({ success: false, message: 'Employee ID diperlukan.' });

    const emp = await query('SELECT * FROM employees WHERE id=$1 AND company_id=$2 AND is_active=true', [employee_id, cid]);
    if (!emp.rows.length) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    const e = emp.rows[0];
    const empPhone = e[PHONE] || e.phone_number || e.phone || '';

    const cfg = (await query('SELECT * FROM company_settings WHERE company_id=$1', [cid])).rows[0] || {};
    const today = new Date().toISOString().split('T')[0];
    const exist = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=$2', [employee_id, today]);
    if (!exist.rows.length || !exist.rows[0].check_in) return res.status(400).json({ success: false, message: 'Belum absen masuk.' });
    if (exist.rows[0].check_out) return res.status(400).json({ success: false, message: 'Sudah absen pulang.' });

    if (cfg.radius_lock_enabled && cfg.office_latitude && cfg.office_longitude && latitude && longitude) {
      const dist = calcDist(parseFloat(cfg.office_latitude), parseFloat(cfg.office_longitude), parseFloat(latitude), parseFloat(longitude));
      if (dist > (cfg.allowed_radius_meters||500)) return res.status(400).json({ success: false, message: `Di luar radius. Jarak: ${Math.round(dist)}m` });
    }

    let selfie = selfie_data ? saveSelfie(selfie_data, employee_id, 'out') : null;
    const hours = ((new Date() - new Date(exist.rows[0].check_in)) / 3600000).toFixed(2);

    const att = await query(
      `UPDATE attendance SET check_out=CURRENT_TIMESTAMP, check_out_selfie=$1,
       check_out_latitude=$2, check_out_longitude=$3, check_out_location=$4,
       work_hours=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *`,
      [selfie, latitude||null, longitude||null, location_address||null, parseFloat(hours), exist.rows[0].id]
    );

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta' });
    if (empPhone) {
      sendWA(cid, empPhone, formatCheckOut(e.name, timeStr, hours, location_address)).catch(()=>{});
    }

    res.json({ success: true, message: `Absen pulang! Durasi: ${hours} jam`, data: att.rows[0] });
  } catch (err) {
    console.error(`${L} 💥`, err);
    res.status(500).json({ success: false, message: 'Gagal: ' + err.message });
  }
});

// Today status
router.get('/today/:employeeId', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const r = await query(
      `SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE a.employee_id=$1 AND a.date=$2 AND e.company_id=$3`,
      [req.params.employeeId, today, req.user.companyId]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// Image
router.get('/image/:filename', (req, res) => {
  const fp = path.join(__dirname, '../../uploads/selfies', path.basename(req.params.filename));
  fs.existsSync(fp) ? res.sendFile(fp) : res.status(404).json({ success: false });
});

function saveSelfie(b64, eid, type) {
  try {
    const dir = path.join(__dirname, '../../uploads/selfies');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/,''), 'base64');
    const f = `${eid}_${type}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(dir, f), buf);
    return '/uploads/selfies/' + f;
  } catch(e) { return null; }
}

function calcDist(lat1,lon1,lat2,lon2) {
  const R=6371000; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

module.exports = router;
