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
      // Normalize phone number
      let phone = String(phoneNumber).replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      if (!phone.startsWith('62')) phone = '62' + phone;

      console.log(`📱 WA SENDING [C:${companyId}] → ${phone}`);
      console.log(`📱 Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      console.log(`📱 API URL: ${config.wa_api_url}`);
      console.log(`📱 Token: ${config.wa_api_token ? config.wa_api_token.substring(0, 10) + '...' : 'none'}`);

      const response = await fetch(config.wa_api_url, {
        method: 'POST',
        headers: { 'Authorization': config.wa_api_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phone, message, countryCode: '62' }),
        timeout: 15000,
      });

      const text = await response.text();
      console.log(`📱 WA RESPONSE [${response.status}]: ${text.substring(0, 300)}`);

      const result = JSON.parse(text);
      const success = !!result.status;

      if (success) {
        console.log(`✅ WA SENT successfully to ${phone}`);
      } else {
        console.log(`❌ WA FAILED:`, result);
      }

      return { success, data: result };
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

module.exports = new WhatsAppService();
