const express = require('express');
const router = express.Router();
const AttendanceService = require('../services/attendanceService');
const WhatsAppService = require('../utils/whatsapp');
const { query } = require('../config/db');

router.get('/', (req, res) => {
  res.json({ status: 'Absenin v3.0 Webhook Active', features: ['multi-tenant', 'overtime', 'selfie', 'geolocation', 'fonnte'] });
});

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
router.post('/', async (req, res) => {
  try {
    let phoneNumber = '';
    let messageText = '';
    let location = null;
    let imageData = null;

    const body = req.body || {};

    console.log(`[WH][${new Date().toLocaleTimeString('id-ID')}] ═══ INCOMING ═══`);
    console.log(`[WH] Body:`, JSON.stringify(body).substring(0, 500));

    // ====== FONNTE FORMAT ======
    if (body.sender || body.pengirim) {
      phoneNumber = (body.sender || body.pengirim || '').replace(/[^0-9]/g, '');

      // ✅ FIX: Prioritas message field yang benar
      // Fonnte sends: "message" (user typed), "pesan" (alias), "text" (meta info like "non-button message")
      // We MUST use "message" or "pesan", NEVER "text" (it contains Fonnte metadata)
      messageText = body.message || body.pesan || '';

      // ✅ FIX: Jangan pakai body.text — itu metadata Fonnte ("non-button message", dll)
      // body.text BUKAN isi pesan user!

      console.log(`[WH] From: "${body.sender}" → "${phoneNumber}" | Msg: "${messageText}"`);

      // Fonnte image handling
      if (body.url && body.url !== '' && (body.type === 'image' || body.tipe === 'image')) {
        console.log(`[WH] 📸 Fonnte image URL: ${body.url}`);

        const empResult = await query(
          'SELECT e.company_id FROM employees e WHERE e.phone_number=$1 AND e.is_active=true',
          [phoneNumber]
        );

        if (empResult.rows.length > 0) {
          const companyId = empResult.rows[0].company_id;
          const waConfig = await query(
            'SELECT wa_api_token FROM company_settings WHERE company_id=$1',
            [companyId]
          );

          if (waConfig.rows.length > 0 && waConfig.rows[0].wa_api_token) {
            try {
              const fetch = require('node-fetch');
              // Try with auth first
              let imgResponse = await fetch(body.url, {
                headers: { 'Authorization': waConfig.rows[0].wa_api_token },
                timeout: 30000,
              });

              if (!imgResponse.ok) {
                // Retry without auth
                imgResponse = await fetch(body.url, { timeout: 30000 });
              }

              if (imgResponse.ok) {
                imageData = await imgResponse.buffer();
                console.log(`[WH] ✅ Image downloaded: ${imageData.length} bytes`);
              } else {
                console.error(`[WH] ❌ Image download failed: HTTP ${imgResponse.status}`);
              }
            } catch (imgErr) {
              console.error('[WH] ❌ Image download error:', imgErr.message);
            }
          }
        }

        // ✅ FIX: Kalau kirim gambar tanpa caption, default ke HADIR
        if (!messageText || messageText.trim() === '') {
          messageText = 'HADIR';
        }
      }

      // Fonnte base64 image
      if (body.image && typeof body.image === 'string' && body.image.length > 100) {
        imageData = body.image;
        if (!messageText || messageText.trim() === '') {
          messageText = 'HADIR';
        }
      }

      // Fonnte location
      if (body.location && body.location !== '' && typeof body.location === 'object') {
        if (body.location.latitude && body.location.longitude) {
          location = {
            latitude: parseFloat(body.location.latitude),
            longitude: parseFloat(body.location.longitude),
          };
          if (!messageText || messageText.trim() === '') {
            messageText = 'HADIR';
          }
        }
      }
    }
    // ====== META/CLOUD API FORMAT ======
    else if (body.entry) {
      const msgs = body.entry?.[0]?.changes?.[0]?.value?.messages;
      if (!msgs?.length) return res.status(200).json({ status: 'no messages' });
      const msg = msgs[0];
      phoneNumber = msg.from;
      if (msg.type === 'text') {
        messageText = msg.text?.body || '';
      } else if (msg.type === 'image') {
        messageText = msg.image?.caption || 'HADIR';
      } else if (msg.type === 'location') {
        location = { latitude: msg.location.latitude, longitude: msg.location.longitude };
        messageText = 'HADIR';
      }
    }
    // ====== GENERIC FORMAT ======
    else {
      phoneNumber = body.from || body.phone || body.phone_number || body.sender || '';
      messageText = body.message || body.text || body.body || '';
      if (body.image || body.imageUrl || body.media_url) {
        imageData = body.image || body.imageUrl || body.media_url;
      }
      if (body.latitude && body.longitude) {
        location = { latitude: parseFloat(body.latitude), longitude: parseFloat(body.longitude) };
      }
    }

    // ✅ FIX: Validasi phone number
    if (!phoneNumber) {
      console.log('[WH] ⚠️ No phone number, skipping');
      return res.status(200).json({ status: 'no phone' });
    }
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    // ✅ FIX: Clean message text — trim whitespace dan remove invisible characters
    messageText = (messageText || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();

    // ✅ FIX: Jika tidak ada message text DAN tidak ada image/location, skip
    if (!messageText && !imageData && !location) {
      console.log('[WH] ⚠️ No usable content, skipping');
      return res.status(200).json({ status: 'no content' });
    }

    // ✅ FIX: Jika message kosong tapi ada image, default HADIR
    if (!messageText && imageData) {
      messageText = 'HADIR';
    }

    console.log(`[WH] Processing → phone: "${phoneNumber}" | cmd: "${messageText}" | img: ${imageData ? 'YES' : 'NO'} | loc: ${location ? 'YES' : 'NO'}`);

    // Process attendance
    const result = await AttendanceService.processCheckIn(phoneNumber, messageText, location, imageData);

    console.log(`[WH] Result: ${result.success ? '✅' : '❌'} | Reply: ${(result.reply || '').substring(0, 80)}...`);

    // Send reply via tenant's WA config
    if (result.reply) {
      const empResult = await query(
        'SELECT company_id FROM employees WHERE phone_number=$1 AND is_active=true',
        [phoneNumber]
      );

      if (empResult.rows.length > 0) {
        const waResult = await WhatsAppService.sendMessage(
          phoneNumber,
          result.reply,
          empResult.rows[0].company_id
        );
        console.log(`[WH] Reply:`, JSON.stringify(waResult).substring(0, 200));
      }
    }

    console.log(`[WH] ═══ DONE ═══`);
    res.status(200).json({ status: 'processed', reply: result.reply });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(200).json({ status: 'error', message: error.message });
  }
});

// Test endpoint
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not in production' });
  const { phone, message, image, latitude, longitude } = req.body;
  if (!phone) return res.status(400).json({ message: 'phone required' });
  const loc = latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null;
  const result = await AttendanceService.processCheckIn(phone, message || '', loc, image || null);
  res.json({ input: { phone, message, hasImage: !!image, hasLocation: !!loc }, result });
});

module.exports = router;
