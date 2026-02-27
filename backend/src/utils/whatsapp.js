const fetch = require('node-fetch');
const { query } = require('../config/db');

class WhatsAppService {
  async getCompanyConfig(companyId) {
    try {
      const r = await query('SELECT wa_api_url, wa_api_token, wa_device_number FROM company_settings WHERE company_id = $1', [companyId]);
      if (r.rows.length === 0) return null;
      const c = r.rows[0];
      if (!c.wa_api_url || !c.wa_api_token) return null;
      return c;
    } catch (e) { return null; }
  }

  async sendMessage(phoneNumber, message, companyId = null) {
    let config = null;
    if (companyId) {
      config = await this.getCompanyConfig(companyId);
    }
    if (!config) {
      console.log(`📱 WA (no config) → ${phoneNumber}: ${message.substring(0, 50)}...`);
      return { success: false, reason: 'WA API not configured for this company' };
    }
    try {
      const response = await fetch(config.wa_api_url, {
        method: 'POST',
        headers: { 'Authorization': config.wa_api_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phoneNumber, message, countryCode: '62' }),
      });
      const result = await response.json();
      return { success: !!result.status, data: result };
    } catch (error) {
      console.error('❌ WA error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getImageFromFonnte(imageUrl, apiToken) {
    try {
      if (!imageUrl || !apiToken) return null;
      const r = await fetch(imageUrl, {
        headers: { 'Authorization': apiToken },
        timeout: 30000,
      });
      if (!r.ok) return null;
      return await r.buffer();
    } catch (e) {
      console.error('❌ Fonnte image download error:', e.message);
      return null;
    }
  }
}

const wa = new WhatsAppService();

async function sendWA(phone, message, companyId) {
  return wa.sendMessage(phone, message, companyId);
}

module.exports = { send: sendWA };
