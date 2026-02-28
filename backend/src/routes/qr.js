const express = require('express');
const router = express.Router();
const qrService = require('../services/qrService');
const { authenticate } = require('../middleware/auth');

// Get all QR codes for company
router.get('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { date, active_only } = req.query;
    const qrcodes = await qrService.getQRCodes(companyId, { date, active_only });
    res.json({ success: true, data: qrcodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get QR code by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const qr = await qrService.getQRById(req.params.id, companyId);
    res.json({ success: true, data: qr });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Create new QR code
router.post('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.userId;
    const qr = await qrService.createQRCode(companyId, req.body, userId);
    res.json({ success: true, message: 'QR Code berhasil dibuat', data: qr });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update QR code
router.put('/:id', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const qr = await qrService.updateQR(req.params.id, companyId, req.body);
    res.json({ success: true, message: 'QR Code berhasil diupdate', data: qr });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete QR code
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    await qrService.deleteQR(req.params.id, companyId);
    res.json({ success: true, message: 'QR Code berhasil dihapus' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Scan QR code (public endpoint for employees)
router.post('/scan/:code', async (req, res) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id wajib diisi' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await qrService.scanQR(req.params.code, employee_id, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get scan logs for QR code
router.get('/:id/logs', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const logs = await qrService.getScanLogs(req.params.id, companyId);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
