const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { sendWA } = require('../helpers/whatsapp');

function norm(p) {
  if (!p) return '';
  let d = String(p).replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '62' + d.substring(1);
  else if (d.startsWith('8') && d.length >= 9) d = '62' + d;
  else if (!d.startsWith('62')) d = '62' + d;
  return d;
}

// HEALTH
router.get('/health', async (req, res) => {
  try {
    const t = await query("SELECT COUNT(*)::int as c FROM employees WHERE is_active=true");
    const p = await query("SELECT COUNT(*)::int as c FROM employees WHERE phone_number IS NOT NULL AND phone_number!='' AND is_active=true");
    const s = await query("SELECT company_id, wa_api_url IS NOT NULL as url, wa_api_token IS NOT NULL as tok FROM company_settings");
    res.json({ success: true, phone_column: 'phone_number', total: t.rows[0].c, with_phone: p.rows[0].c, wa: s.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DEBUG
router.get('/debug-phone/:phone', async (req, res) => {
  try {
    const n = norm(req.params.phone);
    const all = await query(
      `SELECT id, name, phone_number, company_id FROM employees WHERE is_active=true AND phone_number IS NOT NULL AND phone_number!=''`
    );
    res.json({
      input: req.params.phone, normalized: n,
      employees: all.rows.map(r => ({
        ...r, norm: norm(r.phone_number),
        match: norm(r.phone_number) === n || norm(r.phone_number).slice(-10) === n.slice(-10)
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FONNTE
router.post('/fonnte', async (req, res) => {
  const ts = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
  console.log(`\n[WH][${ts}] ═══ INCOMING ═══`);
  console.log('[WH] Body:', JSON.stringify(req.body).substring(0, 500));

  try {
    const b = req.body || {};
    const sender = b.sender || b.from || b.phone || '';
    const message = b.message || b.text || '';

    if (!sender || !message) return res.status(200).json({ ok: true });
    if (b.from_me === true || b.from_me === 'true') return res.status(200).json({ ok: true });
    if (b.member_group || b.isgroup || String(sender).includes('@g.us')) return res.status(200).json({ ok: true });

    const msgLower = String(message).toLowerCase().trim();
    const normalized = norm(sender);
    const last10 = normalized.slice(-10);
    const last9 = normalized.slice(-9);

    console.log(`[WH] From: "${sender}" → "${normalized}" | Msg: "${msgLower}"`);

    // Find employee using phone_number column
    const all = await query(
      `SELECT id, name, phone_number, company_id
       FROM employees
       WHERE is_active=true AND phone_number IS NOT NULL AND phone_number!=''`
    );

    console.log(`[WH] ${all.rows.length} employees with phone_number:`);
    all.rows.forEach(r => {
      const rn = norm(r.phone_number);
      console.log(`[WH]   #${r.id} ${r.name}: "${r.phone_number}" → "${rn}" match=${rn === normalized || rn.slice(-10) === last10 || rn.slice(-9) === last9}`);
    });

    let emp = null;
    for (const r of all.rows) {
      const rn = norm(r.phone_number);
      if (rn === normalized || rn.slice(-10) === last10 || rn.slice(-9) === last9) {
        emp = r;
        console.log(`[WH] ✅ MATCH: ${r.name}`);
        break;
      }
    }

    if (!emp) {
      console.log(`[WH] ❌ NO MATCH`);
      const cs = await query('SELECT company_id FROM company_settings WHERE wa_api_url IS NOT NULL LIMIT 1');
      if (cs.rows.length) {
        await sendWA(cs.rows[0].company_id, sender,
          `❓ Nomor ${sender} belum terdaftar.\n\n📌 Minta admin isi kolom Telepon: ${normalized}\n\n_Absenin_`);
      }
      return res.status(200).json({ ok: true, matched: false });
    }

    const cid = emp.company_id;

    // COMMANDS
    if (['status', 'cek', 'info', 'absen', 'hadir'].includes(msgLower)) {
      const today = new Date().toISOString().split('T')[0];
      const att = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=$2', [emp.id, today]);
      const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

      let reply;
      if (!att.rows.length || !att.rows[0].check_in) {
        reply = `📋 *Status Absensi*\n\n👤 ${emp.name}\n📅 ${dateStr}\n\n❌ Belum absen masuk\n\n_Absenin_`;
      } else {
        const a = att.rows[0];
        const inT = new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
        const outT = a.check_out ? new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : null;
        reply = [
          '📋 *Status Absensi*', '',
          `👤 ${emp.name}`, `📅 ${dateStr}`, '',
          `⏰ Masuk: ${inT} WIB`,
          `⏰ Pulang: ${outT ? outT + ' WIB' : '— (belum)'}`,
          `📊 ${a.status === 'terlambat' ? '⚠️ Terlambat' : '✅ Hadir'}`,
          a.overtime_minutes > 0 ? `🕐 Lembur: ${a.overtime_minutes} menit` : '',
          '', '_Absenin_'
        ].filter(Boolean).join('\n');
      }
      await sendWA(cid, sender, reply);

    } else if (['help', 'bantuan', 'menu', 'hi', 'halo', 'hai'].includes(msgLower)) {
      await sendWA(cid, sender, `📱 *Halo ${emp.name}!*\n\n💬 Ketik:\n• *status* — Cek absensi\n• *help* — Menu\n\n_Absenin_`);

    } else {
      await sendWA(cid, sender, `Halo ${emp.name}! 👋\n\nKetik *status* cek absensi\nKetik *help* untuk menu\n\n_Absenin_`);
    }

    console.log('[WH] ═══ DONE ═══\n');
    res.status(200).json({ ok: true, matched: true, name: emp.name });

  } catch (e) {
    console.error('[WH] 💥', e.message);
    res.status(200).json({ ok: true, error: e.message });
  }
});

// MIDTRANS
router.post('/midtrans', async (req, res) => {
  try {
    const { order_id, transaction_status, fraud_status } = req.body || {};
    if (!order_id) return res.status(200).json({ ok: true });
    // payments uses: invoice_number (not order_id)
    const p = await query('SELECT * FROM payments WHERE invoice_number=$1', [order_id]);
    if (!p.rows.length) return res.status(200).json({ ok: true });
    const pay = p.rows[0];
    let ns = pay.status;
    if (['capture', 'settlement'].includes(transaction_status)) ns = (!fraud_status || fraud_status === 'accept') ? 'paid' : 'fraud';
    else if (transaction_status === 'pending') ns = 'pending';
    else if (['deny', 'cancel', 'expire'].includes(transaction_status)) ns = 'failed';
    await query("UPDATE payments SET status=$1, updated_at=NOW() WHERE id=$2", [ns, pay.id]);
    res.status(200).json({ ok: true });
  } catch (e) { console.error('[WH] Midtrans:', e); res.status(200).json({ ok: true }); }
});

module.exports = router;
