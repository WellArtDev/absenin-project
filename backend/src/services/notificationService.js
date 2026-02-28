const { query } = require('../config/db');
const { sendWhatsAppMessage } = require('../helpers/whatsappHelper');

class NotificationService {
  // Check if notifications are enabled for an event type
  async isNotificationEnabled(companyId, eventType) {
    const result = await query(`
      SELECT COALESCE(notification_settings->>$1, 'true')::boolean as enabled
      FROM companies
      WHERE id = $2
    `, [eventType, companyId]);

    if (result.rows.length === 0) return false;
    return result.rows[0].enabled;
  }

  // Get manager contact info
  async getManagerInfo(companyId) {
    const result = await query(`
      SELECT manager_name, manager_phone
      FROM companies
      WHERE id = $1
    `, [companyId]);

    if (result.rows.length === 0) return null;

    const { manager_name, manager_phone } = result.rows[0];

    if (!manager_phone) return null;

    return { name: manager_name || 'Manager', phone: manager_phone };
  }

  // Send notification to manager
  async sendNotification(companyId, eventType, employeeId, message) {
    try {
      // Check if notification is enabled
      const enabled = await this.isNotificationEnabled(companyId, eventType);
      if (!enabled) return { skipped: true, reason: 'Notification disabled' };

      // Get manager info
      const manager = await this.getManagerInfo(companyId);
      if (!manager) return { skipped: true, reason: 'No manager configured' };

      // Get employee info
      const empResult = await query('SELECT name, employee_id FROM employees WHERE id = $1', [employeeId]);
      if (empResult.rows.length === 0) return { skipped: true, reason: 'Employee not found' };
      const employee = empResult.rows[0];

      // Send WhatsApp message
      const fullMessage = `🔔 *NOTIFIKASI ABSENIN*\n\n${message}\n\n_Karyawan: ${employee.name} (${employee.employee_id || '-'})_`;
      const result = await sendWhatsAppMessage(companyId, manager.phone, fullMessage);

      // Log the notification
      await query(`
        INSERT INTO notification_logs (company_id, event_type, employee_id, manager_phone, message, success, response)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [companyId, eventType, employeeId, manager.phone, message, result.success, JSON.stringify(result)]);

      return { success: result.success, message: 'Notification sent' };
    } catch (error) {
      console.error('Notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify when employee is late
  async notifyLate(companyId, employeeId, checkInTime, workStartTime) {
    const message = `⚠️ *KARYAWAN TERLAMBAT*\n\nKaryawan terlambat hadir hari ini.\n\nJam Masuk: ${checkInTime}\nSeharusnya: ${workStartTime}`;
    return await this.sendNotification(companyId, 'late', employeeId, message);
  }

  // Notify when employee is absent (alpha)
  async notifyAbsent(companyId, employeeId, date) {
    const message = `❌ *KARYAWAN TIDAK HADIR*\n\nKaryawan tidak hadir tanpa keterangan.\n\nTanggal: ${date}`;
    return await this.sendNotification(companyId, 'absent', employeeId, message);
  }

  // Notify when employee requests leave
  async notifyLeaveRequest(companyId, employeeId, leaveType, startDate, endDate, reason) {
    const message = `🏖️ *PENGAJUAN CUTI/IZIN*\n\nJenis: ${leaveType}\nTanggal: ${startDate} s/d ${endDate}\nAlasan: ${reason || '-'}`;
    return await this.sendNotification(companyId, 'leave', employeeId, message);
  }

  // Notify when employee requests overtime
  async notifyOvertimeRequest(companyId, employeeId, date, duration, reason) {
    const message = `🕐 *PENGAJUAN LEMBUR*\n\nTanggal: ${date}\nDurasi: ${duration} jam\nAlasan: ${reason || '-'}`;
    return await this.sendNotification(companyId, 'overtime', employeeId, message);
  }

  // Notify when overtime is approved
  async notifyOvertimeApproved(companyId, employeeId, date, duration) {
    const message = `✅ *LEMBUR DISETUJUI*\n\nPengajuan lembur telah disetujui.\nTanggal: ${date}\nDurasi: ${duration} jam`;
    return await this.sendNotification(companyId, 'overtime_approved', employeeId, message);
  }

  // Get notification logs
  async getNotificationLogs(companyId, filters = {}) {
    const { event_type, employee_id, limit = 50 } = filters;
    let whereClause = 'WHERE nl.company_id = $1';
    const params = [companyId];
    let paramCount = 2;

    if (event_type) {
      whereClause += ` AND nl.event_type = $${paramCount++}`;
      params.push(event_type);
    }

    if (employee_id) {
      whereClause += ` AND nl.employee_id = $${paramCount++}`;
      params.push(employee_id);
    }

    params.push(limit); // Add limit as last parameter

    const result = await query(`
      SELECT nl.*,
        e.name as employee_name,
        e.employee_id as employee_code
      FROM notification_logs nl
      JOIN employees e ON e.id = nl.employee_id
      ${whereClause}
      ORDER BY nl.sent_at DESC
      LIMIT $${paramCount}
    `, params);

    return result.rows;
  }

  // Get notification statistics
  async getNotificationStats(companyId) {
    const result = await query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        COUNT(*) FILTER (WHERE event_type = 'late') as late_notifications,
        COUNT(*) FILTER (WHERE event_type = 'absent') as absent_notifications,
        COUNT(*) FILTER (WHERE event_type = 'leave') as leave_notifications,
        COUNT(*) FILTER (WHERE event_type = 'overtime') as overtime_notifications,
        MAX(sent_at) as last_sent_at
      FROM notification_logs
      WHERE company_id = $1
        AND sent_at >= CURRENT_DATE - INTERVAL '30 days'
    `, [companyId]);

    return result.rows[0];
  }

  // Update notification settings
  async updateNotificationSettings(companyId, settings) {
    const { manager_name, manager_phone, late, absent, leave, overtime } = settings;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (manager_name !== undefined) {
      updates.push(`manager_name = $${paramCount++}`);
      values.push(manager_name);
    }
    if (manager_phone !== undefined) {
      updates.push(`manager_phone = $${paramCount++}`);
      values.push(manager_phone);
    }

    // Build notification_settings JSON
    const notifSettings = {};
    if (late !== undefined) notifSettings.late = late;
    if (absent !== undefined) notifSettings.absent = absent;
    if (leave !== undefined) notifSettings.leave = leave;
    if (overtime !== undefined) notifSettings.overtime = overtime;

    if (Object.keys(notifSettings).length > 0) {
      updates.push(`notification_settings = COALESCE(notification_settings, '{}'::jsonb) || $${paramCount++}::jsonb`);
      values.push(JSON.stringify(notifSettings));
    }

    if (updates.length === 0) {
      return { success: true, message: 'No changes to update' };
    }

    values.push(companyId);

    const result = await query(`
      UPDATE companies
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return { success: true, data: result.rows[0] };
  }
}

module.exports = new NotificationService();
