const { query } = require('../config/db');

class OvertimeService {
  static async calculateAutoOvertime(employeeId, companyId, attendanceId, checkOutTime) {
    try {
      const settings = await query('SELECT work_end, overtime_enabled, overtime_min_minutes, overtime_max_hours FROM company_settings WHERE company_id = $1', [companyId]);
      if (settings.rows.length === 0) return null;
      const config = settings.rows[0];
      if (!config.overtime_enabled) return null;

      const [wh, wm] = config.work_end.split(':').map(Number);
      const checkOut = new Date(checkOutTime);
      const workEnd = new Date(checkOut);
      workEnd.setHours(wh, wm, 0, 0);

      const overtimeMinutes = Math.floor((checkOut - workEnd) / (1000 * 60));
      if (overtimeMinutes < (config.overtime_min_minutes || 30)) return null;

      const maxMin = (config.overtime_max_hours || 4) * 60;
      const finalMin = Math.min(overtimeMinutes, maxMin);
      const otStart = new Date(workEnd);
      const otEnd = new Date(otStart.getTime() + finalMin * 60000);

      const result = await query(
        `INSERT INTO overtime (employee_id, company_id, attendance_id, date, type, start_time, end_time, duration_minutes, status, reason)
         VALUES ($1,$2,$3,CURRENT_DATE,'auto',$4,$5,$6,'completed','Auto: checkout melebihi jam kerja')
         ON CONFLICT (employee_id,date,type) DO UPDATE SET end_time=$5, duration_minutes=$6, updated_at=CURRENT_TIMESTAMP
         RETURNING *`,
        [employeeId, companyId, attendanceId, otStart, otEnd, finalMin]
      );

      await query('UPDATE attendance SET overtime_minutes=$1 WHERE id=$2', [finalMin, attendanceId]);
      return { overtime: result.rows[0], minutes: finalMin, hours: Math.floor(finalMin / 60), remainingMinutes: finalMin % 60 };
    } catch (error) {
      console.error('❌ Auto overtime error:', error);
      return null;
    }
  }

  static async requestManualOvertime(employeeId, companyId, reason = '') {
    try {
      const existing = await query("SELECT * FROM overtime WHERE employee_id=$1 AND date=CURRENT_DATE AND type='manual'", [employeeId]);
      if (existing.rows.length > 0) return { success: false, message: 'Sudah mengajukan lembur hari ini.' };

      const att = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=CURRENT_DATE AND check_in IS NOT NULL', [employeeId]);
      if (att.rows.length === 0) return { success: false, message: 'Harus check-in dulu.' };

      const settings = await query('SELECT work_end FROM company_settings WHERE company_id=$1', [companyId]);
      const [wh, wm] = (settings.rows[0]?.work_end || '17:00').split(':').map(Number);
      const startTime = new Date(); startTime.setHours(wh, wm, 0, 0);

      await query(
        `INSERT INTO overtime (employee_id,company_id,attendance_id,date,type,start_time,status,reason)
         VALUES ($1,$2,$3,CURRENT_DATE,'manual',$4,'pending',$5)
         ON CONFLICT (employee_id,date,type) DO UPDATE SET reason=$5, updated_at=CURRENT_TIMESTAMP`,
        [employeeId, companyId, att.rows[0].id, startTime, reason || 'Pengajuan lembur manual']
      );
      return { success: true, message: 'Pengajuan lembur berhasil! Menunggu persetujuan admin.' };
    } catch (error) {
      console.error('❌ Manual overtime error:', error);
      return { success: false, message: 'Gagal mengajukan lembur.' };
    }
  }

  static async finishOvertime(employeeId) {
    try {
      const ot = await query(
        `SELECT o.*, cs.overtime_max_hours FROM overtime o LEFT JOIN company_settings cs ON cs.company_id=o.company_id
         WHERE o.employee_id=$1 AND o.date=CURRENT_DATE AND o.type='manual' AND o.end_time IS NULL`, [employeeId]);
      if (ot.rows.length === 0) return { success: false, message: 'Tidak ada lembur aktif.' };

      const o = ot.rows[0];
      const diffMin = Math.floor((new Date() - new Date(o.start_time)) / 60000);
      const finalMin = Math.min(diffMin, (o.overtime_max_hours || 4) * 60);

      const result = await query('UPDATE overtime SET end_time=CURRENT_TIMESTAMP, duration_minutes=$1, status=\'completed\', updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [finalMin, o.id]);
      if (o.attendance_id) await query('UPDATE attendance SET overtime_minutes=COALESCE(overtime_minutes,0)+$1 WHERE id=$2', [finalMin, o.attendance_id]);

      return { success: true, overtime: result.rows[0], minutes: finalMin, hours: Math.floor(finalMin / 60), remainingMinutes: finalMin % 60 };
    } catch (error) {
      console.error('❌ Finish overtime error:', error);
      return { success: false, message: 'Gagal menyelesaikan lembur.' };
    }
  }

  static async getEmployeeOvertime(employeeId, month, year) {
    try {
      const result = await query(
        `SELECT COUNT(*) as total_days, SUM(duration_minutes) as total_minutes,
          COUNT(*) FILTER (WHERE type='auto') as auto_count, COUNT(*) FILTER (WHERE type='manual') as manual_count,
          COUNT(*) FILTER (WHERE status='pending') as pending_count, COUNT(*) FILTER (WHERE status='completed') as completed_count
         FROM overtime WHERE employee_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3`,
        [employeeId, month, year]
      );
      const tm = parseInt(result.rows[0]?.total_minutes || 0);
      return {
        totalDays: parseInt(result.rows[0]?.total_days || 0), totalMinutes: tm,
        formatted: `${Math.floor(tm / 60)}j ${tm % 60}m`,
        autoCount: parseInt(result.rows[0]?.auto_count || 0), manualCount: parseInt(result.rows[0]?.manual_count || 0),
        pendingCount: parseInt(result.rows[0]?.pending_count || 0), completedCount: parseInt(result.rows[0]?.completed_count || 0)
      };
    } catch (error) {
      return { totalDays: 0, totalMinutes: 0, formatted: '0j 0m' };
    }
  }
}

module.exports = OvertimeService;
