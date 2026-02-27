const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, type } = req.query;
    const cid = req.user.companyId;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Tanggal mulai dan akhir wajib' });
    }

    let data;
    if (type === 'overtime') {
      const r = await query(
        `SELECT o.date, e.name, o.duration_minutes, o.status, o.reason
         FROM overtime o JOIN employees e ON e.id=o.employee_id
         WHERE o.company_id=$1 AND o.date BETWEEN $2 AND $3
         ORDER BY o.date DESC`,
        [cid, start_date, end_date]
      );
      data = r.rows;
    } else if (type === 'leaves') {
      const r = await query(
        `SELECT l.start_date, l.end_date, e.name, l.type, l.total_days, l.status, l.reason
         FROM leaves l JOIN employees e ON e.id=l.employee_id
         WHERE l.company_id=$1 AND l.start_date BETWEEN $2 AND $3
         ORDER BY l.start_date DESC`,
        [cid, start_date, end_date]
      );
      data = r.rows;
    } else if (type === 'summary') {
      const r = await query(
        `SELECT e.name, e.employee_code,
          COUNT(a.id) as total_days,
          COUNT(CASE WHEN a.status='hadir' THEN 1 END) as hadir,
          COUNT(CASE WHEN a.status='terlambat' THEN 1 END) as terlambat,
          COALESCE(SUM(a.overtime_minutes), 0) as total_overtime_min
         FROM employees e
         LEFT JOIN attendance a ON a.employee_id=e.id AND a.date BETWEEN $2 AND $3
         WHERE e.company_id=$1 AND e.is_active=true
         GROUP BY e.id, e.name, e.employee_code
         ORDER BY e.name`,
        [cid, start_date, end_date]
      );
      data = r.rows;
    } else {
      const r = await query(
        `SELECT a.date, e.name, e.employee_code,
          TO_CHAR(a.check_in, 'HH24:MI') as masuk,
          TO_CHAR(a.check_out, 'HH24:MI') as pulang,
          a.status, a.location_name, a.overtime_minutes
         FROM attendance a JOIN employees e ON e.id=a.employee_id
         WHERE a.company_id=$1 AND a.date BETWEEN $2 AND $3
         ORDER BY a.date DESC, e.name`,
        [cid, start_date, end_date]
      );
      data = r.rows;
    }

    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
