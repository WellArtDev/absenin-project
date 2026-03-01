const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

const getCompanyEmployeeLimit = async (companyId) => {
  const companyResult = await query('SELECT max_employees FROM companies WHERE id=$1', [companyId]);
  if (companyResult.rows.length === 0) {
    throw new Error('Company tidak ditemukan.');
  }

  const maxEmployees = parseInt(companyResult.rows[0].max_employees, 10);
  return Number.isFinite(maxEmployees) && maxEmployees > 0 ? maxEmployees : 10;
};

const getActiveEmployeesCount = async (companyId) => {
  const countResult = await query('SELECT COUNT(*) FROM employees WHERE company_id=$1 AND is_active=true', [companyId]);
  return parseInt(countResult.rows[0].count, 10) || 0;
};

router.get('/', async (req, res) => {
  try {
    const { search, division_id, position_id, employment_status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT e.*, d.name as division_name, p.name as position_name,
      (SELECT COUNT(*) FROM attendance a WHERE a.employee_id=e.id AND a.date=CURRENT_DATE AND a.check_in IS NOT NULL) as today_checked_in
      FROM employees e 
      LEFT JOIN divisions d ON d.id=e.division_id
      LEFT JOIN positions p ON p.id=e.position_id
      WHERE e.company_id=$1 AND e.is_active=true`;
    const params = [req.user.companyId]; let pi = 2;

    if (search) { sql += ` AND (e.name ILIKE $${pi} OR e.phone_number ILIKE $${pi} OR e.employee_code ILIKE $${pi} OR e.email ILIKE $${pi})`; params.push(`%${search}%`); pi++; }
    if (division_id) { sql += ` AND e.division_id=$${pi}`; params.push(division_id); pi++; }
    if (position_id) { sql += ` AND e.position_id=$${pi}`; params.push(position_id); pi++; }
    if (employment_status) { sql += ` AND e.employment_status=$${pi}`; params.push(employment_status); pi++; }
    sql += ` ORDER BY e.name LIMIT $${pi} OFFSET $${pi + 1}`; params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(sql, params);
    const cnt = await query('SELECT COUNT(*) FROM employees WHERE company_id=$1 AND is_active=true', [req.user.companyId]);
    res.json({
      success: true, data: result.rows,
      pagination: { total: parseInt(cnt.rows[0].count), page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(cnt.rows[0].count / limit) }
    });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, d.name as division_name, p.name as position_name
       FROM employees e LEFT JOIN divisions d ON d.id=e.division_id LEFT JOIN positions p ON p.id=e.position_id
       WHERE e.id=$1 AND e.company_id=$2`, [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('phone_number').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    
    let { name, phone_number, employee_code, email, division_id, position_id,
      employment_status, start_date, base_salary, ktp_number, npwp_number, birth_date, birth_place,
      gender, address, emergency_contact, emergency_phone, leave_balance, radius_lock_enabled } = req.body;
    
    // Normalize phone
    phone_number = phone_number.replace(/[^0-9]/g, '');
    if (phone_number.startsWith('0')) phone_number = '62' + phone_number.substring(1);
    if (!phone_number.startsWith('62')) phone_number = '62' + phone_number;

    const ex = await query('SELECT id FROM employees WHERE phone_number=$1', [phone_number]);
    if (ex.rows.length > 0) return res.status(400).json({ success: false, message: 'Nomor HP sudah terdaftar.' });
    
    const activeEmployees = await getActiveEmployeesCount(req.user.companyId);
    const employeeLimit = await getCompanyEmployeeLimit(req.user.companyId);
    if (activeEmployees >= employeeLimit) {
      return res.status(400).json({ success: false, message: `Batas ${employeeLimit} karyawan aktif tercapai. Upgrade paket untuk tambah karyawan.` });
    }

    // Auto generate employee code if not provided
    if (!employee_code) {
      const lastEmp = await query("SELECT employee_code FROM employees WHERE company_id=$1 AND employee_code IS NOT NULL ORDER BY id DESC LIMIT 1", [req.user.companyId]);
      if (lastEmp.rows.length > 0) {
        const lastNum = parseInt(lastEmp.rows[0].employee_code.replace(/[^0-9]/g, '')) || 0;
        employee_code = `EMP${String(lastNum + 1).padStart(4, '0')}`;
      } else {
        employee_code = 'EMP0001';
      }
    }

    const result = await query(
      `INSERT INTO employees (name,phone_number,employee_code,email,division_id,position_id,
        employment_status,start_date,base_salary,ktp_number,npwp_number,birth_date,birth_place,
        gender,address,emergency_contact,emergency_phone,leave_balance,radius_lock_enabled,company_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [name, phone_number, employee_code, email || null, division_id || null, position_id || null,
        employment_status || 'tetap', start_date || null, base_salary || 0, ktp_number || null, npwp_number || null,
        birth_date || null, birth_place || null, gender || null, address || null, emergency_contact || null,
        emergency_phone || null, leave_balance || 12, radius_lock_enabled !== false, req.user.companyId]
    );
    res.status(201).json({ success: true, message: 'Karyawan ditambahkan!', data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.put('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const { id } = req.params;
    const ex = await query('SELECT * FROM employees WHERE id=$1 AND company_id=$2', [id, req.user.companyId]);
    if (ex.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    
    let { name, phone_number, employee_code, email, division_id, position_id,
      employment_status, start_date, end_date, base_salary, ktp_number, npwp_number, birth_date, birth_place,
      gender, address, emergency_contact, emergency_phone, leave_balance, radius_lock_enabled } = req.body;

    if (phone_number) {
      phone_number = phone_number.replace(/[^0-9]/g, '');
      if (phone_number.startsWith('0')) phone_number = '62' + phone_number.substring(1);
      if (!phone_number.startsWith('62')) phone_number = '62' + phone_number;
      if (phone_number !== ex.rows[0].phone_number) {
        const pc = await query('SELECT id FROM employees WHERE phone_number=$1 AND id!=$2', [phone_number, id]);
        if (pc.rows.length > 0) return res.status(400).json({ success: false, message: 'Nomor sudah digunakan.' });
      }
    }

    const result = await query(
      `UPDATE employees SET 
        name=COALESCE($1,name), phone_number=COALESCE($2,phone_number),
        employee_code=COALESCE($3,employee_code), email=$4,
        division_id=$5, position_id=$6, employment_status=COALESCE($7,employment_status),
        start_date=$8, end_date=$9, base_salary=COALESCE($10,base_salary),
        ktp_number=$11, npwp_number=$12, birth_date=$13, birth_place=$14,
        gender=$15, address=$16, emergency_contact=$17, emergency_phone=$18,
        leave_balance=COALESCE($19,leave_balance), radius_lock_enabled=COALESCE($20,radius_lock_enabled),
        updated_at=CURRENT_TIMESTAMP WHERE id=$21 AND company_id=$22 RETURNING *`,
      [name, phone_number, employee_code, email || null,
        division_id || null, position_id || null, employment_status, start_date || null, end_date || null,
        base_salary, ktp_number || null, npwp_number || null, birth_date || null, birth_place || null,
        gender || null, address || null, emergency_contact || null, emergency_phone || null,
        leave_balance, radius_lock_enabled, id, req.user.companyId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.delete('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const result = await query('UPDATE employees SET is_active=false, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND company_id=$2 RETURNING id,name', [req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tidak ditemukan.' });
    res.json({ success: true, message: `${result.rows[0].name} dihapus.` });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
