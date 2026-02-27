const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

/*
  EXACT DB: leaves
  id, employee_id, company_id, type, start_date, end_date,
  total_days, reason, status, approved_by, approved_at, note,
  created_at, updated_at
*/

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT l.*, e.name as employee_name
       FROM leaves l
       JOIN employees e ON e.id = l.employee_id
       WHERE l.company_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.companyId]
    );
    // Map for frontend
    const data = r.rows.map(row => ({
      ...row,
      leave_type: row.type,
    }));
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, leave_type, start_date, end_date, reason } = req.body;
    if (!employee_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Lengkapi semua field' });
    }

    const d1 = new Date(start_date);
    const d2 = new Date(end_date);
    const totalDays = Math.max(1, Math.ceil((d2 - d1) / 86400000) + 1);

    const r = await query(
      `INSERT INTO leaves (employee_id, company_id, type, start_date, end_date, total_days, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [employee_id, req.user.companyId, leave_type || 'annual', start_date, end_date, totalDays, reason || null]
    );

    res.status(201).json({ success: true, message: 'Pengajuan cuti berhasil!', data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status invalid' });
    }

    const r = await query(
      `UPDATE leaves SET status=$1, approved_by=$2, approved_at=NOW(), note=$3, updated_at=NOW()
       WHERE id=$4 AND company_id=$5 RETURNING *`,
      [status, req.user.userId, note || null, req.params.id, req.user.companyId]
    );

    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    // Deduct leave balance if approved
    if (status === 'approved') {
      await query(
        'UPDATE employees SET leave_balance = GREATEST(0, leave_balance - $1) WHERE id = $2',
        [r.rows[0].total_days, r.rows[0].employee_id]
      ).catch(() => {});
    }

    res.json({ success: true, message: `Cuti ${status === 'approved' ? 'disetujui' : 'ditolak'}!`, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
