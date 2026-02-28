const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const cid = req.user.companyId;
    const isSA = req.user.role === 'superadmin';

    const te = await query('SELECT COUNT(*) FROM employees WHERE company_id=$1 AND is_active=true', [cid]);
    const ta = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE check_in IS NOT NULL) as ci,
        COUNT(*) FILTER (WHERE status='HADIR') as ot,
        COUNT(*) FILTER (WHERE status='TERLAMBAT') as late,
        COUNT(*) FILTER (WHERE status='IZIN') as izin,
        COUNT(*) FILTER (WHERE status='SAKIT') as sakit,
        COUNT(*) FILTER (WHERE check_out IS NOT NULL) as co,
        COUNT(*) FILTER (WHERE selfie_checkin_url IS NOT NULL) as selfie,
        COUNT(*) FILTER (WHERE location_name IS NOT NULL) as loc,
        SUM(COALESCE(overtime_minutes,0)) as otm 
       FROM attendance WHERE date=CURRENT_DATE AND company_id=$1`, [cid]);
    
    const to = await query(
      `SELECT COUNT(*) as t, COUNT(*) FILTER (WHERE type='auto') as ac, COUNT(*) FILTER (WHERE type='manual') as mc, 
        COUNT(*) FILTER (WHERE status='pending') as pend, SUM(COALESCE(duration_minutes,0)) as tm 
       FROM overtime WHERE date=CURRENT_DATE AND company_id=$1`, [cid]);
    
    const wk = await query(
      `SELECT date, COUNT(*) FILTER (WHERE check_in IS NOT NULL) as total, 
        COUNT(*) FILTER (WHERE status='HADIR') as on_time, 
        COUNT(*) FILTER (WHERE status='TERLAMBAT') as late, 
        SUM(COALESCE(overtime_minutes,0)) as otm 
       FROM attendance WHERE date>=CURRENT_DATE-INTERVAL '7 days' AND company_id=$1 GROUP BY date ORDER BY date`, [cid]);
    
    const totalEmp = parseInt(te.rows[0].count);
    const checkedIn = parseInt(ta.rows[0]?.ci || 0);
    
    const recent = await query(
      `SELECT a.*, e.name as employee_name, e.phone_number, e.employee_code,
        d.name as division_name
       FROM attendance a JOIN employees e ON a.employee_id=e.id
       LEFT JOIN divisions d ON d.id=e.division_id
       WHERE a.date=CURRENT_DATE AND a.company_id=$1 ORDER BY a.check_in DESC LIMIT 10`, [cid]);
    
    const notCI = await query(
      `SELECT e.name, e.phone_number, e.employee_code, d.name as division_name
       FROM employees e LEFT JOIN divisions d ON d.id=e.division_id
       WHERE e.is_active=true AND e.company_id=$1 AND e.id NOT IN (SELECT employee_id FROM attendance WHERE date=CURRENT_DATE AND check_in IS NOT NULL)
       ORDER BY e.name LIMIT 20`, [cid]);
    
    const ms = await query(
      `SELECT COUNT(*) FILTER (WHERE status='HADIR') as hadir, COUNT(*) FILTER (WHERE status='TERLAMBAT') as terlambat, 
        COUNT(*) FILTER (WHERE status='IZIN') as izin, COUNT(*) FILTER (WHERE status='SAKIT') as sakit, 
        COUNT(*) as total, SUM(COALESCE(overtime_minutes,0)) as otm 
       FROM attendance WHERE date>=DATE_TRUNC('month',CURRENT_DATE) AND company_id=$1`, [cid]);
    
    const otm = parseInt(to.rows[0]?.tm || 0);

    // Pending leaves
    const pendingLeaves = await query('SELECT COUNT(*) FROM leaves WHERE company_id=$1 AND status=\'pending\'', [cid]);

    // Location data for map
    const mapData = await query(
      `SELECT a.latitude, a.longitude, a.checkout_latitude, a.checkout_longitude, a.check_in, a.check_out,
        a.location_name, a.checkout_location_name, e.name as employee_name
       FROM attendance a JOIN employees e ON a.employee_id=e.id 
       WHERE a.date=CURRENT_DATE AND a.company_id=$1 AND (a.latitude IS NOT NULL OR a.checkout_latitude IS NOT NULL)
       ORDER BY a.check_in DESC`, [cid]);

    res.json({
      success: true, data: {
        totalEmployees: totalEmp,
        today: {
          checkedIn, onTime: parseInt(ta.rows[0]?.ot || 0), late: parseInt(ta.rows[0]?.late || 0),
          izin: parseInt(ta.rows[0]?.izin || 0), sakit: parseInt(ta.rows[0]?.sakit || 0),
          checkedOut: parseInt(ta.rows[0]?.co || 0), notCheckedIn: totalEmp - checkedIn,
          attendanceRate: totalEmp > 0 ? Math.round(checkedIn / totalEmp * 100) : 0,
          withSelfie: parseInt(ta.rows[0]?.selfie || 0), withLocation: parseInt(ta.rows[0]?.loc || 0),
          overtimeMinutes: parseInt(ta.rows[0]?.otm || 0)
        },
        overtime: {
          total: parseInt(to.rows[0]?.t || 0), autoCount: parseInt(to.rows[0]?.ac || 0),
          manualCount: parseInt(to.rows[0]?.mc || 0), pending: parseInt(to.rows[0]?.pend || 0),
          totalMinutes: otm, formatted: `${Math.floor(otm / 60)}j ${otm % 60}m`
        },
        pendingLeaves: parseInt(pendingLeaves.rows[0].count),
        weekChart: wk.rows, recentAttendance: recent.rows, notCheckedIn: notCI.rows, monthly: ms.rows[0] || {},
        mapData: mapData.rows,
      }
    });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/attendance', async (req, res) => {
  try {
    const { start_date, end_date, employee_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT a.*, e.name as employee_name, e.phone_number, e.employee_code,
      d.name as division_name, o.duration_minutes as overtime_duration, o.type as overtime_type, o.status as overtime_status 
      FROM attendance a JOIN employees e ON a.employee_id=e.id 
      LEFT JOIN divisions d ON d.id=e.division_id
      LEFT JOIN overtime o ON o.attendance_id=a.id WHERE a.company_id=$1`;
    const params = [req.user.companyId]; let pi = 2;
    if (start_date) { sql += ` AND a.date>=$${pi}`; params.push(start_date); pi++; }
    if (end_date) { sql += ` AND a.date<=$${pi}`; params.push(end_date); pi++; }
    if (employee_id) { sql += ` AND a.employee_id=$${pi}`; params.push(employee_id); pi++; }
    if (status) { sql += ` AND a.status=$${pi}`; params.push(status); pi++; }
    sql += ` ORDER BY a.date DESC, a.check_in DESC LIMIT $${pi} OFFSET $${pi + 1}`; params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
