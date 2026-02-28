const express = require('express');
const router = express.Router();
const AttendanceService = require('../services/attendanceService');
const WhatsAppService = require('../utils/whatsapp');
const { query } = require('../config/db');

// ─────────────────────────────────────────────────────────────
// FONNTE WEBHOOK ENDPOINT
// URL: /api/webhook/fonnte
// ─────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.json({
    status: 'Absenin Fonnte Webhook Active',
    provider: 'Fonnte',
    version: '1.0.0',
    features: ['multi-tenant', 'per-device-routing', 'selfie', 'location', 'overtime'],
    documentation: 'https://fonnte.com'
  });
});

router.post('/', async (req, res) => {
  // Always respond 200 immediately so Fonnte doesn't retry
  res.status(200).json({ status: 'ok', message: 'Webhook received' });

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📨 FONNTE WEBHOOK RECEIVED');
    console.log('📨 Timestamp:', new Date().toISOString());
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📨 Body:', JSON.stringify(req.body, null, 2));
    console.log('═══════════════════════════════════════════════════════════');

    // ─── Parse Fonnte Format ───
    // Fonnte sends: { sender, message, url, type, device, location, image }
    const sender = req.body.sender || req.body.pengirim;
    const message = req.body.message || req.body.pesan || '';
    const imageUrl = req.body.url;
    const messageType = req.body.type || req.body.tipe;
    const deviceNumber = req.body.device || req.body.perangkat;
    const location = req.body.location;
    const imageBase64 = req.body.image;

    // Validate required fields
    if (!sender) {
      console.log('⚠️ No sender number in request');
      return;
    }

    // Normalize phone number
    let phoneNumber = String(sender).replace(/[^0-9]/g, '');
    if (phoneNumber.startsWith('0')) phoneNumber = '62' + phoneNumber.substring(1);

    console.log(`📱 Sender: ${sender} → normalized: ${phoneNumber}`);
    console.log(`💬 Message: "${message}"`);
    console.log(`📸 Image URL: ${imageUrl || 'none'}`);
    console.log(`🖼️ Image type: ${messageType || 'none'}`);
    console.log(`🔔 Device: ${deviceNumber || 'none'}`);
    console.log(`📍 Location: ${location ? JSON.stringify(location) : 'none'}`);

    // ─── Process Image ───
    let imageData = null;

    // Image via URL (Fonnte hosts the image)
    if (imageUrl && (messageType === 'image')) {
      console.log(`📸 Downloading image from Fonnte URL: ${imageUrl}`);
      imageData = await downloadFonnteImage(imageUrl, phoneNumber, deviceNumber);
      if (imageData) {
        console.log(`✅ Image downloaded: ${imageData.length} bytes`);
      } else {
        console.log(`❌ Failed to download image`);
      }
      // If no message text, default to HADIR
      if (!message || message.trim() === '') {
        message = 'HADIR';
      }
    }

    // Image via base64
    if (imageBase64 && typeof imageBase64 === 'string') {
      console.log(`📸 Received base64 image: ${imageBase64.length} chars`);
      imageData = imageBase64;
      if (!message || message.trim() === '') {
        message = 'HADIR';
      }
    }

    // ─── Process Location ───
    let locationData = null;
    if (location && location.latitude && location.longitude) {
      locationData = {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude)
      };
      console.log(`📍 Location: ${locationData.latitude}, ${locationData.longitude}`);
      if (!message || message.trim() === '') {
        message = 'HADIR';
      }
    }

    // ─── Resolve Company from Device Number ───
    let forcedCompanyId = null;
    if (deviceNumber) {
      const cleanDevice = String(deviceNumber).replace(/[^0-9]/g, '');
      console.log(`🔔 Looking up company for device: ${cleanDevice}`);

      const dev = await query(
        `SELECT company_id, wa_api_token FROM company_settings WHERE wa_device_number=$1 OR wa_device_number=$2 LIMIT 1`,
        [cleanDevice, cleanDevice.startsWith('62') ? '0' + cleanDevice.substring(2) : '62' + cleanDevice]
      );

      if (dev.rows.length > 0) {
        forcedCompanyId = dev.rows[0].company_id;
        console.log(`✅ Company found: ${forcedCompanyId}`);
      } else {
        console.log(`⚠️ No company found for device: ${cleanDevice}`);
      }
    }

    // ─── Process Attendance ───
    console.log(`� Processing attendance for ${phoneNumber}...`);
    const result = await AttendanceService.processCheckIn(
      phoneNumber,
      message.trim(),
      locationData,
      imageData,
      forcedCompanyId
    );

    console.log(`📱 Result: success=${result.success}, hasReply=${!!result.reply}, companyId=${result.companyId}`);
    if (result.reply) {
      console.log(`💬 Reply: ${result.reply.substring(0, 200)}...`);
    }

    // ─── Send Reply ───
    if (result.reply && result.companyId) {
      console.log(`📤 Sending reply to ${phoneNumber}...`);
      const waService = new WhatsAppService();
      const sendResult = await waService.sendMessage(phoneNumber, result.reply, result.companyId);
      console.log(`📤 Send result:`, JSON.stringify(sendResult, null, 2));
    } else {
      console.log(`⚠️ No reply sent - reply: ${!!result.reply}, companyId: ${result.companyId}`);
    }

    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Fonnte Webhook Error:', error);
    console.error('❌ Stack:', error.stack);
  }
});

// ─── Helper: Download Fonnte Image ───
async function downloadFonnteImage(imageUrl, senderPhone, deviceNumber) {
  try {
    let apiToken = null;

    // Try to get API token from device
    if (deviceNumber) {
      const cleanDevice = String(deviceNumber).replace(/[^0-9]/g, '');
      const d = await query(
        `SELECT wa_api_token FROM company_settings WHERE wa_device_number=$1 OR wa_device_number=$2 LIMIT 1`,
        [cleanDevice, cleanDevice.startsWith('62') ? '0' + cleanDevice.substring(2) : '62' + cleanDevice]
      );
      if (d.rows.length > 0) apiToken = d.rows[0].wa_api_token;
    }

    // Fallback: get token from employee
    if (!apiToken && senderPhone) {
      const e = await query(
        `SELECT cs.wa_api_token FROM employees e JOIN company_settings cs ON cs.company_id=e.company_id WHERE e.phone_number=$1 AND e.is_active=true LIMIT 1`,
        [senderPhone]
      );
      if (e.rows.length > 0) apiToken = e.rows[0].wa_api_token;
    }

    const fetch = require('node-fetch');
    const headers = apiToken ? { 'Authorization': apiToken } : {};

    console.log(`📸 Fetching image: ${imageUrl}`);
    if (apiToken) console.log(`📸 Using token: ${apiToken.substring(0, 10)}...`);

    const r = await fetch(imageUrl, { headers, timeout: 30000 });
    if (r.ok) {
      const buf = await r.buffer();
      console.log(`✅ Fonnte image downloaded: ${buf.length} bytes`);
      return buf;
    }

    console.log(`⚠️ Image fetch failed: ${r.status}`);
    // Retry without auth
    const r2 = await fetch(imageUrl, { timeout: 30000 });
    if (r2.ok) return await r2.buffer();

    return null;
  } catch (e) {
    console.error('❌ Image download error:', e.message);
    return null;
  }
}

// Test endpoint
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }

  const { phone, message, image, latitude, longitude, company_id } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'phone number is required' });
  }

  try {
    const loc = latitude && longitude ? {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    } : null;

    const result = await AttendanceService.processCheckIn(
      phone,
      message || 'HADIR',
      loc,
      image || null,
      company_id || null
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
