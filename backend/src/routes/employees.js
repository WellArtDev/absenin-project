const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

const PHONE = 'phone_number';

function normPhone(p) {
  if (!p) return null;
  let d = String(p).replace(/[^0-9]/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = '62' + d.substring(1);
  else if (d.startsWith('8') && d.length >= 9) d = '62' + d;
  else if (!d.startsWith('62')) d = '62' + d;
  return d;
}

router.use(authenticate);

// List
router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT e.*, d.name as division_name, p.name as position_name,
        e.${PHONE} as phone
       FROM employees e
       LEFT JOIN divisions d ON d.id = e.division_id
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE e.company_id = $1 AND e.is_active = true
       ORDER BY e.name`,
      [req.user.companyId]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    console.error('[EMP] List error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Get one
router.get('/:id', async (req, res) => {
  try {
    const r = await query(
      `SELECT e.*, d.name as division_name, p.name as position_name, e.${PHONE} as phone
       FROM employees e
       LEFT JOIN divisions d ON d.id = e.division_id
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE e.id = $1 AND e.company_id = $2`,
      [req.params.id, req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Create
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, employee_id, email, phone, division_id, position_id, join_date } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });

    // Check max employees
    const count = await query('SELECT COUNT(*) as c FROM employees WHERE company_id=$1 AND is_active=true', [req.user.companyId]);
    const company = await query('SELECT max_employees FROM companies WHERE id=$1', [req.user.companyId]);
    const max = company.rows[0]?.max_employees || 10;
    if (parseInt(count.rows[0].c) >= max) {
      return res.status(400).json({ success: false, message: `Maksimal ${max} karyawan. Upgrade plan untuk menambah.` });
    }

    const normalizedPhone = normPhone(phone);
    console.log(`[EMP] Create: ${name} | Phone: "${phone}" → "${normalizedPhone}" | Column: ${PHONE}`);

    const r = await query(
      `INSERT INTO employees (name, employee_id, email, ${PHONE}, division_id, position_id, join_date, company_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING *, ${PHONE} as phone`,
      [name, employee_id||null, email||null, normalizedPhone, division_id||null, position_id||null, join_date||null, req.user.companyId]
    );

    res.status(201).json({ success: true, message: 'Karyawan ditambahkan!', data: r.rows[0] });
  } catch (e) {
    console.error('[EMP] Create error:', e.message);
    if (e.code === '23505') return res.status(400).json({ success: false, message: 'ID/email sudah terdaftar' });
    res.status(500).json({ success: false, message: e.message });
  }
});

// Update
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, employee_id, email, phone, division_id, position_id, join_date } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });

    const normalizedPhone = normPhone(phone);
    console.log(`[EMP] Update #${req.params.id}: Phone: "${phone}" → "${normalizedPhone}" | Column: ${PHONE}`);

    const r = await query(
      `UPDATE employees SET name=$1, employee_id=$2, email=$3, ${PHONE}=$4,
       division_id=$5, position_id=$6, join_date=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8 AND company_id=$9 RETURNING *, ${PHONE} as phone`,
      [name, employee_id||null, email||null, normalizedPhone, division_id||null, position_id||null, join_date||null, req.params.id, req.user.companyId]
    );

    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Karyawan diupdate!', data: r.rows[0] });
  } catch (e) {
    console.error('[EMP] Update error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Delete (soft)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const r = await query(
      'UPDATE employees SET is_active=false, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND company_id=$2 RETURNING id',
      [req.params.id, req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Karyawan dihapus' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
