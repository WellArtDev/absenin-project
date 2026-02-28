const express = require('express');
const router = express.Router();
const payrollService = require('../services/payrollService');
const { authenticate } = require('../middleware/auth');

// Get payroll settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const settings = await payrollService.getPayrollSettings(companyId);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update payroll settings
router.put('/settings', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const settings = await payrollService.updatePayrollSettings(companyId, req.body);
    res.json({ success: true, message: 'Pengaturan payroll berhasil disimpan', data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get all payroll periods
router.get('/periods', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const periods = await payrollService.getPayrollPeriods(companyId);
    res.json({ success: true, data: periods });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get or create payroll period
router.get('/periods/:month/:year', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { month, year } = req.params;
    const period = await payrollService.getPayrollPeriod(companyId, parseInt(month), parseInt(year));
    res.json({ success: true, data: period });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate payroll for a period
router.post('/periods/:month/:year/calculate', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { month, year } = req.params;

    const period = await payrollService.getPayrollPeriod(companyId, parseInt(month), parseInt(year));
    const result = await payrollService.calculatePeriodPayroll(period.id, companyId);

    res.json({
      success: true,
      message: `Payroll berhasil dihitung untuk ${result.records.length} karyawan`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payroll records for a period
router.get('/periods/:periodId/records', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { periodId } = req.params;
    const records = await payrollService.getPayrollRecords(periodId, companyId);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update individual payroll record
router.put('/records/:recordId', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { recordId } = req.params;
    const record = await payrollService.updatePayrollRecord(recordId, companyId, req.body);
    res.json({ success: true, message: 'Payroll record berhasil diupdate', data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Approve payroll period
router.put('/periods/:periodId/approve', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { periodId } = req.params;
    await payrollService.approvePayrollPeriod(periodId, companyId);
    res.json({ success: true, message: 'Payroll periode berhasil disetujui' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Mark payroll as paid
router.put('/periods/:periodId/paid', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { periodId } = req.params;
    await payrollService.markPayrollAsPaid(periodId, companyId);
    res.json({ success: true, message: 'Payroll berhasil ditandai sudah dibayar' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
