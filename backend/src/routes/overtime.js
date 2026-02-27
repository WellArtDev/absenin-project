const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

/*
  EXACT DB: overtime
  id, employee_id, company_id, attendance_id, date, type,
  start_time, end_time, duration_minutes, status,
  reason, approved_by, approved_at, note, created_at, updated_at
*/

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT o.*, e.name as employee_name
       FROM overtime o
       JOIN employees e ON e.id = o.employee_id
       WHERE o.company_id = $1
       ORDER BY o.date DESC, o.created_at DESC`,
      [req.user.companyId]
    );
    // Map for frontend
    const data = r.rows.map(row => ({
      ...row,
      duration_hours: row.duration_minutes ? (row.duration_minutes / 60).toFixed(1) : 0,
    }));
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status invalid' });
    }
    const r = await query(
      `UPDATE overtime SET status=$1, approved_by=$2, approved_at=NOW(), note=$3, updated_at=NOW()
       WHERE id=$4 AND company_id=$5 RETURNING *`,
      [status, req.user.userId, note || null, req.params.id, req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: `Lembur ${status === 'approved' ? 'disetujui' : 'ditolak'}!` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
