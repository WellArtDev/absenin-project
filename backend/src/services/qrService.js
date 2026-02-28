const { query } = require('../config/db');
const crypto = require('crypto');

class QRService {
  // Generate unique QR code string
  generateCode() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  // Get all QR codes for a company
  async getQRCodes(companyId, filters = {}) {
    const { date, active_only } = filters;
    let whereClause = 'WHERE qr.company_id = $1';
    const params = [companyId];
    let paramCount = 2;

    if (date) {
      whereClause += ` AND qr.date = $${paramCount++}`;
      params.push(date);
    }

    if (active_only) {
      whereClause += ` AND qr.is_active = true`;
    }

    const result = await query(`
      SELECT qr.*,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        u.name as created_by_name,
        COUNT(DISTINCT qsl.employee_id) as scan_count
      FROM qr_codes qr
      LEFT JOIN shifts s ON s.id = qr.shift_id
      LEFT JOIN users u ON u.id = qr.created_by
      LEFT JOIN qr_scan_logs qsl ON qsl.qr_code_id = qr.id
      ${whereClause}
      GROUP BY qr.id, s.name, s.start_time, s.end_time, u.name
      ORDER BY qr.created_at DESC
    `, params);

    return result.rows;
  }

  // Get QR code by ID
  async getQRById(qrId, companyId) {
    const result = await query(`
      SELECT qr.*,
        s.name as shift_name,
        s.start_time,
        s.end_time
      FROM qr_codes qr
      LEFT JOIN shifts s ON s.id = qr.shift_id
      WHERE qr.id = $1 AND qr.company_id = $2
    `, [qrId, companyId]);

    if (result.rows.length === 0) {
      throw new Error('QR Code tidak ditemukan');
    }

    return result.rows[0];
  }

  // Create new QR code
  async createQRCode(companyId, qrData, userId) {
    const { shift_id, date, location_name, expires_at } = qrData;

    // Generate unique code
    let code;
    let attempts = 0;
    do {
      code = this.generateCode();
      const existing = await query('SELECT id FROM qr_codes WHERE code = $1', [code]);
      if (existing.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Gagal generate unique code');
    }

    const result = await query(`
      INSERT INTO qr_codes (company_id, shift_id, code, date, location_name, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [companyId, shift_id || null, code, date || new Date().toISOString().split('T')[0], location_name, expires_at || null, userId]);

    return result.rows[0];
  }

  // Update QR code
  async updateQR(qrId, companyId, qrData) {
    const { is_active, location_name, expires_at } = qrData;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (location_name !== undefined) {
      updates.push(`location_name = $${paramCount++}`);
      values.push(location_name);
    }
    if (expires_at !== undefined) {
      updates.push(`expires_at = $${paramCount++}`);
      values.push(expires_at);
    }

    if (updates.length === 0) {
      return await this.getQRById(qrId, companyId);
    }

    values.push(qrId, companyId);

    const result = await query(`
      UPDATE qr_codes
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND company_id = $${paramCount++}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new Error('QR Code tidak ditemukan');
    }

    return result.rows[0];
  }

  // Delete QR code
  async deleteQR(qrId, companyId) {
    await query('DELETE FROM qr_codes WHERE id = $1 AND company_id = $2', [qrId, companyId]);
  }

  // Scan QR code (employee attendance)
  async scanQR(qrCode, employeeId, ipAddress, userAgent) {
    // Find QR code
    const qrResult = await query(`
      SELECT qr.*, s.id as shift_id, s.start_time, s.end_time,
        c.id as company_id,
        (qr.expires_at IS NULL OR qr.expires_at > CURRENT_TIMESTAMP) as not_expired
      FROM qr_codes qr
      LEFT JOIN shifts s ON s.id = qr.shift_id
      LEFT JOIN companies c ON c.id = qr.company_id
      WHERE qr.code = $1 AND qr.is_active = true
    `, [qrCode]);

    if (qrResult.rows.length === 0) {
      // Log failed scan
      await query(`
        INSERT INTO qr_scan_logs (qr_code_id, employee_id, scanned_at, success, failure_reason)
        VALUES ((SELECT id FROM qr_codes WHERE code = $1 LIMIT 1), $2, CURRENT_TIMESTAMP, false, 'QR code tidak ditemukan atau tidak aktif')
      `, [qrCode, employeeId]);
      throw new Error('QR Code tidak valid atau tidak aktif');
    }

    const qr = qrResult.rows[0];

    // Check expiration
    if (!qr.not_expired) {
      await query(`
        INSERT INTO qr_scan_logs (qr_code_id, employee_id, scanned_at, success, failure_reason)
        VALUES ($1, $2, CURRENT_TIMESTAMP, false, 'QR code sudah kadaluarsa')
      `, [qr.id, employeeId]);
      throw new Error('QR Code sudah kadaluarsa');
    }

    // Check if employee already scanned this QR today
    const today = new Date().toISOString().split('T')[0];
    const existingScan = await query(`
      SELECT id FROM qr_scan_logs
      WHERE qr_code_id = $1 AND employee_id = $2
        AND DATE(scanned_at) = $3
        AND success = true
    `, [qr.id, employeeId, today]);

    if (existingScan.rows.length > 0) {
      return {
        success: false,
        message: 'Anda sudah scan QR ini hari ini',
        already_scanned: true
      };
    }

    // Log the scan
    const logResult = await query(`
      INSERT INTO qr_scan_logs (qr_code_id, employee_id, scanned_at, ip_address, user_agent, success)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, true)
      RETURNING id
    `, [qr.id, employeeId, ipAddress || null, userAgent || null]);

    // Update scan count
    await query('UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = $1', [qr.id]);

    return {
      success: true,
      message: 'QR Code berhasil discan',
      qr_id: qr.id,
      scan_log_id: logResult.rows[0].id,
      shift_id: qr.shift_id,
      company_id: qr.company_id
    };
  }

  // Get QR scan logs
  async getScanLogs(qrId, companyId) {
    const result = await query(`
      SELECT qsl.*,
        e.name as employee_name,
        e.employee_id as employee_code,
        e.phone_number
      FROM qr_scan_logs qsl
      JOIN employees e ON e.id = qsl.employee_id
      JOIN qr_codes qr ON qr.id = qsl.qr_code_id
      WHERE qsl.qr_code_id = $1 AND qr.company_id = $2
      ORDER BY qsl.scanned_at DESC
    `, [qrId, companyId]);

    return result.rows;
  }
}

module.exports = new QRService();
