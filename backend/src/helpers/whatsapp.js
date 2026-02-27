const { query } = require('../config/db');

// Column names from actual DB
const EMP_PHONE_COL = 'phone_number';
const USER_PHONE_COL = 'phone';

async function sendWA(companyId, targetNumber, message) {
  const ts = new Date().toISOString();
  const L = `[WA][${ts}][C:${companyId}]`;

  console.log(`${L} === SEND START ===`);
  console.log(`${L} To: ${targetNumber} | Msg: ${message?.length || 0} chars`);

  try {
    if (!companyId || !targetNumber || !message) {
      console.log(`${L} ❌ Missing params`);
      return { success: false, reason: 'Missing params' };
    }

    const settings = await query(
      'SELECT wa_api_url, wa_api_token, wa_device_number FROM company_settings WHERE company_id = $1',
      [companyId]
    );

    if (!settings.rows.length) {
      console.log(`${L} ❌ No settings row`);
      return { success: false, reason: 'No settings' };
    }

    const { wa_api_url, wa_api_token, wa_device_number } = settings.rows[0];
    console.log(`${L} URL: ${wa_api_url || 'NULL'} | Token: ${wa_api_token ? wa_api_token.substring(0,8)+'...' : 'NULL'}`);

    if (!wa_api_url || !wa_api_token) {
      console.log(`${L} ❌ URL or token missing`);
      return { success: false, reason: 'Config missing' };
    }

    let phone = String(targetNumber).replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (!phone.startsWith('62')) phone = '62' + phone;

    console.log(`${L} 📤 POST ${wa_api_url} → ${phone}`);

    const fetch = require('node-fetch');
    const resp = await fetch(wa_api_url, {
      method: 'POST',
      headers: { 'Authorization': wa_api_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message, countryCode: '62' }),
      timeout: 15000,
    });

    const text = await resp.text();
    console.log(`${L} 📥 ${resp.status}: ${text}`);

    let result;
    try { result = JSON.parse(text); } catch(e) {
      return { success: false, reason: 'Bad response', raw: text.substring(0,200) };
    }

    const ok = result.status === true || result.process === 'processing' || result.detail === 'message sent';
    console.log(`${L} ${ok ? '✅ OK' : '❌ FAIL'}`);
    return { success: ok, data: result };
  } catch (e) {
    console.error(`${L} 💥 ${e.message}`);
    return { success: false, reason: e.message };
  }
}

function formatCheckIn(name, time, status, loc) {
  const date = new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'Asia/Jakarta' });
  return ['📋 *ABSENSI MASUK*','',`👤 ${name}`,`📅 ${date}`,`⏰ ${time} WIB`,`📊 ${status==='late'?'⚠️ TERLAMBAT':'✅ TEPAT WAKTU'}`,loc?`📍 ${loc}`:'','','_Absenin_'].filter(Boolean).join('\n');
}

function formatCheckOut(name, time, hours, loc) {
  const date = new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'Asia/Jakarta' });
  return ['📋 *ABSENSI PULANG*','',`👤 ${name}`,`📅 ${date}`,`⏰ ${time} WIB`,hours?`⏱️ Durasi: ${hours} jam`:'',loc?`📍 ${loc}`:'','','_Absenin_'].filter(Boolean).join('\n');
}

function formatLateAlert(name, time) {
  return ['⚠️ *KARYAWAN TERLAMBAT*','',`👤 ${name}`,`⏰ Masuk: ${time} WIB`,'','_Absenin_'].join('\n');
}

module.exports = { sendWA, formatCheckIn, formatCheckOut, formatLateAlert, EMP_PHONE_COL, USER_PHONE_COL };
