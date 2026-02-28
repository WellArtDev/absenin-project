const express = require('express');
const router = express.Router();
const broadcastService = require('../services/broadcastService');
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/db');

// Send broadcast
router.post('/send', authenticate, async (req, res) => {
  try {
    const { message, target = 'all', division_id, position_id, image_url } = req.body;
    const companyId = req.user.companyId;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Pesan wajib diisi' });
    }

    const result = await broadcastService.sendBroadcast(companyId, {
      message,
      target,
      divisionId,
      positionId,
      imageUrl: image_url
    });

    res.json({
      success: true,
      message: `Broadcast terkirim ke ${result.success}/${result.total} karyawan`,
      data: result
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get broadcast history
router.get('/history', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const history = await broadcastService.getHistory(companyId, 50);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get broadcast history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get broadcast stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Get total broadcasts
    const totalResult = await query(
      'SELECT COUNT(*) as count FROM broadcasts WHERE company_id = $1',
      [companyId]
    );

    // Get total recipients reached
    const reachedResult = await query(
      'SELECT SUM(success_count) as count FROM broadcasts WHERE company_id = $1',
      [companyId]
    );

    // Get last broadcast time
    const lastResult = await query(
      'SELECT created_at FROM broadcasts WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [companyId]
    );

    res.json({
      success: true,
      data: {
        totalBroadcasts: parseInt(totalResult.rows[0].count) || 0,
        totalReached: parseInt(reachedResult.rows[0].count) || 0,
        lastBroadcast: lastResult.rows[0]?.created_at || null
      }
    });
  } catch (error) {
    console.error('Get broadcast stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
