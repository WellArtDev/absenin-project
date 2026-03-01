const express = require('express');
const router = express.Router();
const slipService = require('../services/slipService');
const { authenticate, requireFeature } = require('../middleware/auth');

router.use(authenticate, requireFeature('attendance_slip'));

// Get all employees with attendance summary for a month
router.get('/employees', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { month, year } = req.query;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const employees = await slipService.getEmployeeSlipsList(companyId, currentMonth, currentYear);
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get attendance slip data for specific employee
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const slipData = await slipService.getAttendanceSlip(employeeId, currentMonth, currentYear, companyId);
    res.json({ success: true, data: slipData });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Get full report for all employees
router.get('/report', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { month, year } = req.query;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const report = await slipService.getAllEmployeesReport(companyId, currentMonth, currentYear);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
