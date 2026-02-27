const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { division_id } = req.query;
    let sql = `SELECT p.*, d.name as division_name, COUNT(e.id) as employee_count FROM positions p 
      LEFT JOIN divisions d ON d.id=p.division_id
      LEFT JOIN employees e ON e.position_id=p.id AND e.is_active=true 
      WHERE p.company_id=$1 AND p.is_active=true`;
    const params = [req.user.companyId];
    if (division_id) { sql += ' AND p.division_id=$2'; params.push(division_id); }
    sql += ' GROUP BY p.id, d.name ORDER BY d.name, p.name';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, division_id, description, base_salary } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama jabatan diperlukan.' });
    const result = await query('INSERT INTO positions (company_id,division_id,name,description,base_salary) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.companyId, division_id || null, name, description || null, base_salary || 0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Jabatan sudah ada.' });
    console.error(error); res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, division_id, description, base_salary } = req.body;
    const result = await query('UPDATE positions SET name=COALESCE($1,name), division_id=$2, description=$3, base_salary=COALESCE($4,base_salary), updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND company_id=$6 RETURNING *',
      [name, division_id || null, description || null, base_salary, req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('UPDATE positions SET is_active=false WHERE id=$1 AND company_id=$2 RETURNING name', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    res.json({ success: true, message: `Jabatan ${result.rows[0].name} dihapus.` });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
