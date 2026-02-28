const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, employee_id, status, type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT o.*, e.name as employee_name, e.phone_number, e.employee_code, u.name as approved_by_name
      FROM overtime o JOIN employees e ON o.employee_id=e.id LEFT JOIN users u ON o.approved_by=u.id WHERE o.company_id=$1`;
    const params = [req.user.companyId]; let pi = 2;
    if (start_date) { sql += ` AND o.date>=$${pi}`; params.push(start_date); pi++; }
    if (end_date) { sql += ` AND o.date<=$${pi}`; params.push(end_date); pi++; }
    if (employee_id) { sql += ` AND o.employee_id=$${pi}`; params.push(employee_id); pi++; }
    if (status) { sql += ` AND o.status=$${pi}`; params.push(status); pi++; }
    if (type) { sql += ` AND o.type=$${pi}`; params.push(type); pi++; }
    sql += ` ORDER BY o.date DESC LIMIT $${pi} OFFSET $${pi + 1}`; params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    const cnt = await query('SELECT COUNT(*) FROM overtime WHERE company_id=$1', [req.user.companyId]);
    res.json({ success: true, data: result.rows, pagination: { total: parseInt(cnt.rows[0].count), page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/summary', async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth() + 1;
    const y = req.query.year || new Date().getFullYear();
    const result = await query(
      `SELECT e.id, e.name, e.employee_code, COUNT(o.id) as overtime_days, SUM(COALESCE(o.duration_minutes,0)) as total_minutes,
        COUNT(o.id) FILTER (WHERE o.type='auto') as auto_count, COUNT(o.id) FILTER (WHERE o.type='manual') as manual_count,
        COUNT(o.id) FILTER (WHERE o.status='pending') as pending_count, COUNT(o.id) FILTER (WHERE o.status='completed') as completed_count
       FROM employees e LEFT JOIN overtime o ON o.employee_id=e.id AND EXTRACT(MONTH FROM o.date)=$2 AND EXTRACT(YEAR FROM o.date)=$3
       WHERE e.company_id=$1 AND e.is_active=true GROUP BY e.id ORDER BY total_minutes DESC NULLS LAST`,
      [req.user.companyId, m, y]);
    const data = result.rows.map(r => ({
      ...r, total_minutes: parseInt(r.total_minutes) || 0,
      formatted: `${Math.floor((parseInt(r.total_minutes) || 0) / 60)}j ${(parseInt(r.total_minutes) || 0) % 60}m`
    }));
    res.json({ success: true, data, period: { month: m, year: y } });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const result = await query('UPDATE overtime SET status=\'approved\', approved_by=$1, approved_at=CURRENT_TIMESTAMP WHERE id=$2 AND company_id=$3 RETURNING *',
      [req.user.userId, req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const result = await query('UPDATE overtime SET status=\'rejected\', approved_by=$1, approved_at=CURRENT_TIMESTAMP, note=$2 WHERE id=$3 AND company_id=$4 RETURNING *',
      [req.user.userId, req.body.note || 'Ditolak', req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
