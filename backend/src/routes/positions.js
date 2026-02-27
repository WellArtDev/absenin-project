const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT p.*, COUNT(e.id)::int as employee_count
       FROM positions p
       LEFT JOIN employees e ON e.position_id=p.id AND e.is_active=true
       WHERE p.company_id=$1 AND p.is_active=true
       GROUP BY p.id ORDER BY p.name`,
      [req.user.companyId]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, description, division_id, base_salary } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib' });
    const r = await query(
      'INSERT INTO positions (name, description, division_id, base_salary, company_id, is_active) VALUES ($1,$2,$3,$4,$5,true) RETURNING *',
      [name, description || null, division_id || null, base_salary || null, req.user.companyId]
    );
    res.status(201).json({ success: true, message: 'Ditambahkan!', data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, description, base_salary } = req.body;
    const r = await query(
      'UPDATE positions SET name=$1, description=$2, base_salary=$3, updated_at=NOW() WHERE id=$4 AND company_id=$5 RETURNING *',
      [name, description || null, base_salary || null, req.params.id, req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Updated!' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await query('UPDATE positions SET is_active=false WHERE id=$1 AND company_id=$2', [req.params.id, req.user.companyId]);
    res.json({ success: true, message: 'Dihapus' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
