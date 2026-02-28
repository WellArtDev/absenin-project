const { query } = require('../config/db');
const { sendWA } = require('../helpers/whatsapp');

class BroadcastService {
  // Send broadcast to all employees or filtered group
  async sendBroadcast(companyId, options) {
    const {
      message,
      target = 'all', // 'all', 'division', 'position'
      divisionId = null,
      positionId = null,
      imageUrl = null,
      sendAsAdmin = false
    } = options;

    if (!message || !message.trim()) {
      throw new Error('Pesan tidak boleh kosong');
    }

    // Build query to get target employees
    let employeeQuery = `
      SELECT id, name, phone, employee_id, division_name, position_name
      FROM employees
      WHERE company_id = $1
        AND phone IS NOT NULL
        AND phone != ''
    `;
    const params = [companyId];

    if (target === 'division' && divisionId) {
      employeeQuery += ' AND division_id = $2';
      params.push(divisionId);
    } else if (target === 'position' && positionId) {
      employeeQuery += ' AND position_id = $2';
      params.push(positionId);
    }

    employeeQuery += ' ORDER BY name ASC';

    const result = await query(employeeQuery, params);
    const employees = result.rows;

    if (employees.length === 0) {
      throw new Error('Tidak ada karyawan dengan nomor HP valid');
    }

    // Get company WA config
    const configResult = await query(
      'SELECT wa_api_url, wa_api_token, wa_device_number FROM company_settings WHERE company_id = $1',
      [companyId]
    );

    if (configResult.rows.length === 0) {
      throw new Error('WhatsApp belum dikonfigurasi');
    }

    const config = configResult.rows[0];
    if (!config.wa_api_url || !config.wa_api_token || !config.wa_device_number) {
      throw new Error('WhatsApp belum dikonfigurasi lengkap');
    }

    // Prepare WA API config
    const waConfig = {
      apiUrl: config.wa_api_url,
      apiToken: config.wa_api_token,
      deviceNumber: config.wa_device_number
    };

    // Send to each employee
    const results = {
      total: employees.length,
      success: 0,
      failed: 0,
      details: []
    };

    for (const emp of employees) {
      try {
        const normalPhone = emp.phone.replace(/[^0-9]/g, '');
        if (!normalPhone || normalPhone.length < 10) {
          results.failed++;
          results.details.push({
            employeeId: emp.id,
            employeeName: emp.name,
            phone: emp.phone,
            status: 'failed',
            error: 'Invalid phone number'
          });
          continue;
        }

        const targetNumber = normalPhone.startsWith('0') ? '62' + normalPhone.slice(1) : normalPhone;

        // Send via Fonnte
        const payload = {
          target: targetNumber,
          message: `${message}\n\n_Absenin Auto-Broadcast_`,
          ...(imageUrl && { url: imageUrl })
        };

        const response = await fetch(waConfig.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': waConfig.apiToken
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (responseData.status || responseData.reason === 'success') {
          results.success++;
          results.details.push({
            employeeId: emp.id,
            employeeName: emp.name,
            phone: emp.phone,
            status: 'success'
          });
        } else {
          results.failed++;
          results.details.push({
            employeeId: emp.id,
            employeeName: emp.name,
            phone: emp.phone,
            status: 'failed',
            error: responseData.reason || 'Unknown error'
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.failed++;
        results.details.push({
          employeeId: emp.id,
          employeeName: emp.name,
          phone: emp.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Save broadcast history
    await query(`
      INSERT INTO broadcasts (
        company_id, message, target_type, division_id, position_id,
        image_url, total_recipients, success_count, failed_count,
        created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `, [
      companyId,
      message,
      target,
      divisionId || null,
      positionId || null,
      imageUrl || null,
      results.total,
      results.success,
      results.failed,
      sendAsAdmin ? null : companyId, // TODO: get actual user ID
    ]);

    return results;
  }

  // Get broadcast history
  async getHistory(companyId, limit = 20) {
    const result = await query(`
      SELECT
        b.*,
        u.name as created_by_name
      FROM broadcasts b
      LEFT JOIN users u ON u.id = b.created_by
      WHERE b.company_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2
    `, [companyId, limit]);

    return result.rows;
  }
}

module.exports = new BroadcastService();
