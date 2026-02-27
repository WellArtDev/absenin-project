const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT d.*, COUNT(e.id)::int as employee_count
       FROM divisions d
       LEFT JOIN employees e ON e.division_id=d.id AND e.is_active=true
       WHERE d.company_id=$1 AND d.is_active=true
       GROUP BY d.id ORDER BY d.name`,
      [req.user.companyId]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib' });
    const r = await query(
      'INSERT INTO divisions (name, description, company_id, is_active) VALUES ($1,$2,$3,true) RETURNING *',
      [name, description || null, req.user.companyId]
    );
    res.status(201).json({ success: true, message: 'Ditambahkan!', data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    const r = await query(
      'UPDATE divisions SET name=$1, description=$2, updated_at=NOW() WHERE id=$3 AND company_id=$4 RETURNING *',
      [name, description || null, req.params.id, req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Updated!', data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await query('UPDATE divisions SET is_active=false WHERE id=$1 AND company_id=$2', [req.params.id, req.user.companyId]);
    res.json({ success: true, message: 'Dihapus' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
