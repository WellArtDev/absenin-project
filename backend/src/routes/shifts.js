const express = require('express');
const router = express.Router();
const shiftService = require('../services/shiftService');
const { authenticate, requireFeature } = require('../middleware/auth');

router.use(authenticate, requireFeature('shift_management'));

// Get all shifts for company
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const shifts = await shiftService.getShifts(companyId);
    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get shift by ID
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const shift = await shiftService.getShiftById(req.params.id, companyId);
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Create shift
router.post('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const shift = await shiftService.createShift(companyId, req.body);
    res.json({ success: true, message: 'Shift berhasil dibuat', data: shift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update shift
router.put('/:id', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const shift = await shiftService.updateShift(req.params.id, companyId, req.body);
    res.json({ success: true, message: 'Shift berhasil diupdate', data: shift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete shift
router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    await shiftService.deleteShift(req.params.id, companyId);
    res.json({ success: true, message: 'Shift berhasil dihapus' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Assign shift to employee
router.post('/assign', async (req, res) => {
  try {
    const { employee_id, shift_id, effective_date } = req.body;

    if (!employee_id || !shift_id || !effective_date) {
      return res.status(400).json({ success: false, message: 'employee_id, shift_id, dan effective_date wajib diisi' });
    }

    await shiftService.assignShift(employee_id, shift_id, effective_date);
    res.json({ success: true, message: 'Shift berhasil diassign ke karyawan' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get employees with their shifts
router.get('/employees/list', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const employees = await shiftService.getEmployeesWithShifts(companyId);
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get employee shift for specific date
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Parameter date wajib diisi (YYYY-MM-DD)' });
    }

    const shift = await shiftService.getEmployeeShift(req.params.employeeId, date);
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
