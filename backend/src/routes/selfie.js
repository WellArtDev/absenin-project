const express = require('express');
const router = express.Router();
const selfieService = require('../utils/selfie');
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/db');
const upload = selfieService.getMulterConfig();

router.post('/upload', authenticate, upload.single('selfie'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File selfie diperlukan.' });
    const { employee_id, type } = req.body;
    if (!employee_id) return res.status(400).json({ success: false, message: 'employee_id diperlukan.' });
    const emp = await query('SELECT name FROM employees WHERE id=$1 AND company_id=$2', [employee_id, req.user.companyId]);
    if (emp.rows.length === 0) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    const result = await selfieService.processSelfie(req.file.buffer, emp.rows[0].name, type || 'checkin');
    if (result.success) {
      const col = type === 'checkout' ? 'selfie_checkout_url' : 'selfie_checkin_url';
      await query(`UPDATE attendance SET ${col}=$1, selfie_verified=true WHERE employee_id=$2 AND date=CURRENT_DATE`, [result.url, employee_id]);
      res.json({ success: true, data: { url: result.url } });
    } else res.status(400).json({ success: false, message: result.error });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
