const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, requireFeature } = require('../middleware/auth');
router.use(authenticate, requireFeature('export_csv'));

router.get('/export', async (req, res) => {
  try {
    const { start_date, end_date, format = 'csv' } = req.query;
    const cid = req.user.companyId;
    const sd = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const ed = end_date || new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT e.employee_code as "ID", e.name as "Nama", e.phone_number as "HP",
              d.name as "Divisi", p.name as "Jabatan", a.date as "Tanggal",
              TO_CHAR(a.check_in,'HH24:MI') as "Masuk", TO_CHAR(a.check_out,'HH24:MI') as "Pulang", a.status as "Status",
              a.location_name as "Lokasi", a.distance_meters as "Jarak(m)",
              CASE WHEN a.selfie_checkin_url IS NOT NULL THEN 'Ya' ELSE 'Tidak' END as "Selfie",
              COALESCE(a.overtime_minutes,0) as "Lembur(min)",
              CONCAT(FLOOR(COALESCE(a.overtime_minutes,0)/60),'j ',MOD(COALESCE(a.overtime_minutes,0),60),'m') as "Lembur"
       FROM attendance a JOIN employees e ON a.employee_id=e.id 
       LEFT JOIN divisions d ON d.id=e.division_id
       LEFT JOIN positions p ON p.id=e.position_id
       WHERE a.company_id=$1 AND a.date BETWEEN $2 AND $3 ORDER BY a.date DESC, e.name`,
      [cid, sd, ed]);
    if (format === 'csv') {
      const h = ['ID', 'Nama', 'HP', 'Dept', 'Divisi', 'Jabatan', 'Tanggal', 'Masuk', 'Pulang', 'Status', 'Lokasi', 'Jarak(m)', 'Selfie', 'Lembur(min)', 'Lembur'];
      let csv = h.join(',') + '\n';
      result.rows.forEach(r => { csv += h.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(',') + '\n'; });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=absensi_${sd}_${ed}.csv`);
      return res.send('\ufeff' + csv);
    }
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/monthly', async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth() + 1;
    const y = req.query.year || new Date().getFullYear();
    const result = await query(
      `SELECT e.id, e.name, e.employee_code, d.name as division_name, p.name as position_name,
        COUNT(*) FILTER (WHERE a.status='HADIR') as hadir, COUNT(*) FILTER (WHERE a.status='TERLAMBAT') as terlambat,
        COUNT(*) FILTER (WHERE a.status='IZIN') as izin, COUNT(*) FILTER (WHERE a.status='SAKIT') as sakit, 
        COUNT(a.id) as total_records,
        SUM(COALESCE(a.overtime_minutes,0)) as overtime_minutes,
        CONCAT(FLOOR(SUM(COALESCE(a.overtime_minutes,0))/60),'j ',MOD(SUM(COALESCE(a.overtime_minutes,0))::int,60),'m') as overtime_formatted,
        COUNT(*) FILTER (WHERE a.selfie_checkin_url IS NOT NULL) as selfie_count
       FROM employees e 
       LEFT JOIN attendance a ON a.employee_id=e.id AND EXTRACT(MONTH FROM a.date)=$2 AND EXTRACT(YEAR FROM a.date)=$3
       LEFT JOIN divisions d ON d.id=e.division_id
       LEFT JOIN positions p ON p.id=e.position_id
       WHERE e.company_id=$1 AND e.is_active=true GROUP BY e.id, d.name, p.name ORDER BY e.name`,
      [req.user.companyId, m, y]);
    res.json({ success: true, data: result.rows, period: { month: m, year: y } });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT a.*, e.name as employee_name, e.phone_number, e.employee_code,
        d.name as division_name, p.name as position_name
       FROM attendance a JOIN employees e ON a.employee_id=e.id 
       LEFT JOIN divisions d ON d.id=e.division_id LEFT JOIN positions p ON p.id=e.position_id
       WHERE a.company_id=$1 AND a.date=$2 ORDER BY e.name`,
      [req.user.companyId, date]);
    res.json({ success: true, data: result.rows, date });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
