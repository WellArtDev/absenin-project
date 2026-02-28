const express = require('express');
const router = express.Router();
const AttendanceService = require('../services/attendanceService');
const WhatsAppService = require('../utils/whatsapp');
const { query } = require('../config/db');

router.get('/', (req, res) => {
  res.json({ status: 'Absenin Webhook Active', features: ['multi-tenant', 'fonnte-per-tenant', 'overtime', 'selfie', 'gps'] });
});

// ── Multi-tenant webhook: resolve company from wa_device_number first ──
router.post('/', async (req, res) => {
  // Always respond 200 immediately so Fonnte doesn't retry
  res.status(200).json({ status: 'ok' });

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📨 WEBHOOK RECEIVED');
    console.log('📨 Body keys:', Object.keys(req.body));
    console.log('📨 Full body:', JSON.stringify(req.body, null, 2));

    let phoneNumber = '', messageText = '', location = null, imageData = null, deviceNumber = null;

    // ====== FONNTE FORMAT ======
    if (req.body.sender || req.body.pengirim) {
      phoneNumber = (req.body.sender || req.body.pengirim || '').replace(/[^0-9]/g, '');
      messageText  = (req.body.message || req.body.pesan || '').trim();
      // Fonnte sends the receiving device number — used to scope to the right tenant
      deviceNumber = (req.body.device || req.body.perangkat || '').replace(/[^0-9]/g, '');

      // Image via URL
      if (req.body.url && (req.body.type === 'image' || req.body.tipe === 'image')) {
        console.log(`📸 Fonnte image URL: ${req.body.url}`);
        imageData = await downloadFonnteImage(req.body.url, phoneNumber, deviceNumber);
        if (!messageText) messageText = 'HADIR';
      }
      // Image via base64
      if (req.body.image && typeof req.body.image === 'string') {
        imageData = req.body.image;
        if (!messageText) messageText = 'HADIR';
      }
      // Location
      if (req.body.location) {
        location = { latitude: parseFloat(req.body.location.latitude), longitude: parseFloat(req.body.location.longitude) };
        if (!messageText) messageText = 'HADIR';
      }
    }
    // ====== META/CLOUD API FORMAT ======
    else if (req.body.entry) {
      const msgs = req.body.entry?.[0]?.changes?.[0]?.value?.messages;
      if (!msgs?.length) return;
      const msg = msgs[0];
      phoneNumber = msg.from;
      if (msg.type === 'text') messageText = msg.text?.body || '';
      else if (msg.type === 'image') { messageText = msg.image?.caption || 'HADIR'; }
      else if (msg.type === 'location') { location = { latitude: msg.location.latitude, longitude: msg.location.longitude }; messageText = 'HADIR'; }
    }
    // ====== GENERIC FORMAT ======
    else {
      phoneNumber   = (req.body.from || req.body.phone || req.body.sender || '').replace(/[^0-9]/g, '');
      messageText   = req.body.message || req.body.text || '';
      deviceNumber  = (req.body.device || '').replace(/[^0-9]/g, '');
      if (req.body.image) imageData = req.body.image;
      if (req.body.latitude && req.body.longitude) location = { latitude: parseFloat(req.body.latitude), longitude: parseFloat(req.body.longitude) };
    }

    if (!phoneNumber) return;
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    // ── Resolve company via device number (multi-tenant key) ──
    // If we know which WA device received it, scope employee lookup to that company
    let forcedCompanyId = null;
    if (deviceNumber) {
      const dev = await query(
        `SELECT company_id FROM company_settings WHERE wa_device_number=$1 OR wa_device_number=$2 LIMIT 1`,
        [deviceNumber, deviceNumber.startsWith('62') ? '0' + deviceNumber.substring(2) : '62' + deviceNumber]
      );
      if (dev.rows.length > 0) forcedCompanyId = dev.rows[0].company_id;
    }

    const result = await AttendanceService.processCheckIn(phoneNumber, messageText || '', location, imageData, forcedCompanyId);
    console.log(`📱 [company:${forcedCompanyId || 'auto'}] ${phoneNumber} → "${messageText}" ${imageData ? '📸' : ''} ${location ? '📍' : ''} → ${result.success ? '✅' : '❌'}`);
    console.log(`📱 Result:`, JSON.stringify({ success: result.success, hasReply: !!result.reply, companyId: result.companyId }, null, 2));
    if (result.reply) {
      console.log(`📱 Reply message: ${result.reply.substring(0, 200)}...`);
    }

    // Send reply via the tenant's own WA config
    if (result.reply && result.companyId) {
      console.log(`📱 SENDING REPLY to ${phoneNumber}...`);
      const waService = new WhatsAppService();
      const sendResult = await waService.sendMessage(phoneNumber, result.reply, result.companyId);
      console.log(`📱 SEND RESULT:`, JSON.stringify(sendResult, null, 2));
    } else {
      console.log(`📱 NO REPLY SENT - reply: ${!!result.reply}, companyId: ${result.companyId}`);
    }
    console.log('═══════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Webhook error:', error);
  }
});

// ── Helper: download Fonnte image using tenant's API token ──
async function downloadFonnteImage(imageUrl, senderPhone, deviceNumber) {
  try {
    // Resolve API token: prefer device-based lookup, fallback to employee-based
    let apiToken = null;

    if (deviceNumber) {
      const d = await query(
        `SELECT wa_api_token FROM company_settings WHERE wa_device_number=$1 OR wa_device_number=$2 LIMIT 1`,
        [deviceNumber, deviceNumber.startsWith('62') ? '0' + deviceNumber.substring(2) : '62' + deviceNumber]
      );
      if (d.rows.length > 0) apiToken = d.rows[0].wa_api_token;
    }

    if (!apiToken && senderPhone) {
      const e = await query(`SELECT cs.wa_api_token FROM employees e JOIN company_settings cs ON cs.company_id=e.company_id WHERE e.phone_number=$1 AND e.is_active=true LIMIT 1`, [senderPhone]);
      if (e.rows.length > 0) apiToken = e.rows[0].wa_api_token;
    }

    const fetch = require('node-fetch');
    const headers = apiToken ? { 'Authorization': apiToken } : {};
    const r = await fetch(imageUrl, { headers, timeout: 30000 });
    if (r.ok) {
      const buf = await r.buffer();
      console.log(`✅ Fonnte image downloaded: ${buf.length} bytes`);
      return buf;
    }
    // Retry without auth
    const r2 = await fetch(imageUrl, { timeout: 30000 });
    if (r2.ok) return await r2.buffer();
    return null;
  } catch (e) {
    console.error('❌ Image download error:', e.message);
    return null;
  }
}

// Test endpoint (dev only)
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not in production' });
  const { phone, message, image, latitude, longitude, company_id } = req.body;
  if (!phone) return res.status(400).json({ message: 'phone required' });
  const loc = latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null;
  const result = await AttendanceService.processCheckIn(phone, message || '', loc, image || null, company_id || null);
  res.json({ result });
});

module.exports = router;
