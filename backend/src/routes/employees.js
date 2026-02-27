const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

/*
  EXACT DB: employees
  id, name, phone_number, position, department, company_id, is_active,
  created_at, updated_at, employee_code, email, division_id, position_id,
  employment_status, start_date, end_date, base_salary, ktp_number,
  npwp_number, birth_date, birth_place, gender, address,
  emergency_contact, emergency_phone, photo_url, leave_balance,
  radius_lock_enabled, phone
*/

function normPhone(p) {
  if (!p) return null;
  let d = String(p).replace(/[^0-9]/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = '62' + d.substring(1);
  else if (d.startsWith('8') && d.length >= 9) d = '62' + d;
  return d;
}

router.use(authenticate);

// LIST
router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT e.id, e.name, e.phone_number, e.employee_code, e.email,
        e.department, e.position, e.division_id, e.position_id,
        e.employment_status, e.start_date, e.is_active, e.base_salary,
        e.leave_balance, e.gender, e.address,
        d.name as division_name, p.name as position_name
       FROM employees e
       LEFT JOIN divisions d ON d.id = e.division_id
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE e.company_id = $1 AND e.is_active = true
       ORDER BY e.name`,
      [req.user.companyId]
    );
    // Map phone_number to phone for frontend compatibility
    const data = r.rows.map(row => ({
      ...row,
      phone: row.phone_number,
      employee_id: row.employee_code,
      join_date: row.start_date,
    }));
    res.json({ success: true, data });
  } catch (e) {
    console.error('[EMP] List:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET ONE
router.get('/:id', async (req, res) => {
  try {
    const r = await query(
      `SELECT e.*, d.name as division_name, p.name as position_name
       FROM employees e
       LEFT JOIN divisions d ON d.id = e.division_id
       LEFT JOIN positions p ON p.id = e.position_id
       WHERE e.id = $1 AND e.company_id = $2`,
      [req.params.id, req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const row = r.rows[0];
    row.phone = row.phone_number;
    row.employee_id = row.employee_code;
    row.join_date = row.start_date;
    res.json({ success: true, data: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// CREATE
router.post('/', adminOnly, async (req, res) => {
  try {
    const b = req.body;
    const name = b.name;
    if (!name) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });

    // Check limit
    const cnt = await query('SELECT COUNT(*)::int as c FROM employees WHERE company_id=$1 AND is_active=true', [req.user.companyId]);
    const co = await query('SELECT max_employees FROM companies WHERE id=$1', [req.user.companyId]);
    const max = co.rows[0]?.max_employees || 10;
    if (cnt.rows[0].c >= max) {
      return res.status(400).json({ success: false, message: `Max ${max} karyawan. Upgrade plan.` });
    }

    const phone = normPhone(b.phone || b.phone_number);
    console.log(`[EMP] Create: ${name} | phone input="${b.phone||b.phone_number}" → "${phone}"`);

    const r = await query(
      `INSERT INTO employees
        (name, employee_code, email, phone_number, division_id, position_id,
         department, position, employment_status, start_date, base_salary,
         gender, address, company_id, is_active, leave_balance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,12)
       RETURNING *`,
      [
        name,
        b.employee_id || b.employee_code || null,
        b.email || null,
        phone,
        b.division_id || null,
        b.position_id || null,
        b.department || null,
        b.position_name || b.position_text || null,
        b.employment_status || 'tetap',
        b.join_date || b.start_date || null,
        b.base_salary || 0,
        b.gender || null,
        b.address || null,
        req.user.companyId,
      ]
    );

    const row = r.rows[0];
    row.phone = row.phone_number;
    res.status(201).json({ success: true, message: 'Karyawan ditambahkan!', data: row });
  } catch (e) {
    console.error('[EMP] Create:', e.message);
    if (e.code === '23505') return res.status(400).json({ success: false, message: 'Data duplikat' });
    res.status(500).json({ success: false, message: e.message });
  }
});

// UPDATE
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const b = req.body;
    if (!b.name) return res.status(400).json({ success: false, message: 'Nama wajib' });

    const phone = normPhone(b.phone || b.phone_number);
    console.log(`[EMP] Update #${req.params.id}: phone="${b.phone||b.phone_number}" → "${phone}"`);

    const r = await query(
      `UPDATE employees SET
        name=$1, employee_code=$2, email=$3, phone_number=$4,
        division_id=$5, position_id=$6, department=$7,
        employment_status=$8, start_date=$9, base_salary=$10,
        gender=$11, address=$12, updated_at=CURRENT_TIMESTAMP
       WHERE id=$13 AND company_id=$14
       RETURNING *`,
      [
        b.name,
        b.employee_id || b.employee_code || null,
        b.email || null,
        phone,
        b.division_id || null,
        b.position_id || null,
        b.department || null,
        b.employment_status || null,
        b.join_date || b.start_date || null,
        b.base_salary || null,
        b.gender || null,
        b.address || null,
        req.params.id,
        req.user.companyId,
      ]
    );

    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const row = r.rows[0];
    row.phone = row.phone_number;
    res.json({ success: true, message: 'Updated!', data: row });
  } catch (e) {
    console.error('[EMP] Update:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE (soft)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const r = await query(
      'UPDATE employees SET is_active=false, updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING id',
      [req.params.id, req.user.companyId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Dihapus' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
