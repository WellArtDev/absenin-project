const { query } = require('../config/db');

async function sendWA(companyId, targetNumber, message) {
  const L = `[WA][C:${companyId}]`;
  try {
    if (!companyId || !targetNumber || !message) {
      console.log(`${L} SKIP: missing params`);
      return { success: false, reason: 'Missing params' };
    }

    const s = await query(
      'SELECT wa_api_url, wa_api_token, wa_device_number FROM company_settings WHERE company_id=$1',
      [companyId]
    );
    if (!s.rows.length || !s.rows[0].wa_api_url || !s.rows[0].wa_api_token) {
      console.log(`${L} SKIP: not configured`);
      return { success: false, reason: 'Not configured' };
    }

    const { wa_api_url, wa_api_token } = s.rows[0];
    let phone = String(targetNumber).replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (!phone.startsWith('62')) phone = '62' + phone;

    console.log(`${L} 📤 → ${phone}`);
    const fetch = require('node-fetch');
    const resp = await fetch(wa_api_url, {
      method: 'POST',
      headers: { 'Authorization': wa_api_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message, countryCode: '62' }),
      timeout: 15000,
    });

    const text = await resp.text();
    console.log(`${L} 📥 ${resp.status}: ${text.substring(0, 200)}`);
    let result;
    try { result = JSON.parse(text); } catch(e) { return { success: false, raw: text.substring(0,200) }; }
    const ok = result.status === true || result.process === 'processing';
    console.log(`${L} ${ok ? '✅' : '❌'}`);
    return { success: ok, data: result };
  } catch (e) {
    console.error(`${L} 💥 ${e.message}`);
    return { success: false, reason: e.message };
  }
}

function fmtDate() {
  return new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Jakarta' });
}

function formatCheckIn(name, time, status, loc) {
  return [`📋 *ABSENSI MASUK*`,'',`👤 ${name}`,`📅 ${fmtDate()}`,`⏰ ${time} WIB`,
    `📊 ${status==='late'?'⚠️ TERLAMBAT':'✅ TEPAT WAKTU'}`,loc?`📍 ${loc}`:'','','_Absenin_'].filter(Boolean).join('\n');
}

function formatCheckOut(name, time, mins, loc) {
  const h = mins ? (mins/60).toFixed(1) : null;
  return [`📋 *ABSENSI PULANG*`,'',`👤 ${name}`,`📅 ${fmtDate()}`,`⏰ ${time} WIB`,
    h?`⏱️ Durasi: ${h} jam`:'',loc?`📍 ${loc}`:'','','_Absenin_'].filter(Boolean).join('\n');
}

function formatLateAlert(name, time) {
  return `⚠️ *KARYAWAN TERLAMBAT*\n\n👤 ${name}\n⏰ ${time} WIB\n\n_Absenin_`;
}

module.exports = { sendWA, formatCheckIn, formatCheckOut, formatLateAlert };
