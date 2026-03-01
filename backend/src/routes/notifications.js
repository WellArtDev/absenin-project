const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticate, requireFeature } = require('../middleware/auth');

router.use(authenticate, requireFeature('notifications'));

// Get notification settings
router.get('/settings', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const result = await require('../config/db').query(`
      SELECT
        manager_name,
        manager_phone,
        notification_settings
      FROM companies
      WHERE id = $1
    `, [companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update notification settings
router.put('/settings', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const result = await notificationService.updateNotificationSettings(companyId, req.body);
    res.json({ success: true, message: 'Pengaturan notifikasi berhasil diupdate', data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get notification logs
router.get('/logs', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { event_type, employee_id, limit } = req.query;
    const logs = await notificationService.getNotificationLogs(companyId, { event_type, employee_id, limit });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const stats = await notificationService.getNotificationStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test notification
router.post('/test', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message wajib diisi' });
    }

    const manager = await notificationService.getManagerInfo(companyId);
    if (!manager) {
      return res.status(400).json({ success: false, message: 'Manager belum dikonfigurasi' });
    }

    const { sendWA } = require('../helpers/whatsapp');
    const testMessage = `🧪 *TEST NOTIFIKASI*\n\n${message}`;
    const result = await sendWA(companyId, manager.phone, testMessage);

    res.json({ success: true, message: 'Test notifikasi terkirim', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
