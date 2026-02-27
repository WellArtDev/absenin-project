const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Dashboard stats
router.get('/', async (req, res) => {
  try {
    const cid = req.user.companyId;
    const today = new Date().toISOString().split('T')[0];

    const [empR, attR, lateR, leaveR] = await Promise.all([
      query('SELECT COUNT(*)::int as c FROM employees WHERE company_id=$1 AND is_active=true', [cid]),
      query("SELECT COUNT(*)::int as c FROM attendance WHERE company_id=$1 AND date=$2 AND check_in IS NOT NULL", [cid, today]),
      query("SELECT COUNT(*)::int as c FROM attendance WHERE company_id=$1 AND date=$2 AND status='terlambat'", [cid, today]),
      query("SELECT COUNT(*)::int as c FROM leaves WHERE company_id=$1 AND status='approved' AND start_date<=$2 AND end_date>=$2", [cid, today]),
    ]);

    const total = empR.rows[0].c;
    const present = attR.rows[0].c;
    const late = lateR.rows[0].c;
    const onLeave = leaveR.rows[0].c;
    const absent = Math.max(0, total - present - onLeave);

    res.json({
      success: true,
      data: {
        total_employees: total,
        present, late, absent, on_leave: onLeave,
        attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
      }
    });
  } catch (e) {
    console.error('[ANALYTICS]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Attendance list by date
router.get('/attendance', async (req, res) => {
  try {
    const cid = req.user.companyId;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const empId = req.query.employee_id;

    let sql = `
      SELECT a.*, e.name as employee_name, e.phone_number, e.employee_code,
        e.department, d.name as division_name
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN divisions d ON d.id = e.division_id
      WHERE a.company_id = $1 AND a.date = $2`;
    const params = [cid, date];

    if (empId) {
      sql += ' AND a.employee_id = $3';
      params.push(empId);
    }

    sql += ' ORDER BY a.check_in DESC NULLS LAST';

    const r = await query(sql, params);
    res.json({ success: true, data: { attendance: r.rows, date } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
