const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, COUNT(e.id) as employee_count FROM divisions d 
       LEFT JOIN employees e ON e.division_id=d.id AND e.is_active=true 
       WHERE d.company_id=$1 AND d.is_active=true GROUP BY d.id ORDER BY d.name`, [req.user.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama divisi diperlukan.' });
    const result = await query('INSERT INTO divisions (company_id,name,description) VALUES ($1,$2,$3) RETURNING *',
      [req.user.companyId, name, description || null]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Divisi sudah ada.' });
    console.error(error); res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await query('UPDATE divisions SET name=COALESCE($1,name), description=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 AND company_id=$4 RETURNING *',
      [name, description || null, req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('UPDATE divisions SET is_active=false WHERE id=$1 AND company_id=$2 RETURNING name', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    res.json({ success: true, message: `Divisi ${result.rows[0].name} dihapus.` });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
