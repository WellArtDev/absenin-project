const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { employee_id, status, type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT l.*, e.name as employee_name, e.phone_number, u.name as approved_by_name
      FROM leaves l JOIN employees e ON l.employee_id=e.id LEFT JOIN users u ON l.approved_by=u.id WHERE l.company_id=$1`;
    const params = [req.user.companyId]; let pi = 2;
    if (employee_id) { sql += ` AND l.employee_id=$${pi}`; params.push(employee_id); pi++; }
    if (status) { sql += ` AND l.status=$${pi}`; params.push(status); pi++; }
    if (type) { sql += ` AND l.type=$${pi}`; params.push(type); pi++; }
    sql += ` ORDER BY l.created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`; params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, type, start_date, end_date, reason } = req.body;
    if (!employee_id || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
    const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;
    const result = await query(
      'INSERT INTO leaves (employee_id,company_id,type,start_date,end_date,total_days,reason) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [employee_id, req.user.companyId, type || 'cuti', start_date, end_date, days, reason || null]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const result = await query(
      'UPDATE leaves SET status=\'approved\', approved_by=$1, approved_at=CURRENT_TIMESTAMP WHERE id=$2 AND company_id=$3 RETURNING *',
      [req.user.userId, req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    // Deduct leave balance
    if (result.rows[0].type === 'cuti') {
      await query('UPDATE employees SET leave_balance=GREATEST(leave_balance-$1,0) WHERE id=$2', [result.rows[0].total_days, result.rows[0].employee_id]);
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const result = await query(
      'UPDATE leaves SET status=\'rejected\', approved_by=$1, approved_at=CURRENT_TIMESTAMP, note=$2 WHERE id=$3 AND company_id=$4 RETURNING *',
      [req.user.userId, req.body.note || 'Ditolak', req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
