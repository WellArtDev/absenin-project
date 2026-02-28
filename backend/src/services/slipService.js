const { query } = require('../config/db');

class SlipService {
  // Get attendance data for slip generation
  async getAttendanceSlip(employeeId, month, year, companyId) {
    // Get employee info
    const employeeResult = await query(`
      SELECT e.*, e.employee_code as employee_id, d.name as division_name, p.name as position_name
      FROM employees e
      LEFT JOIN divisions d ON d.id = e.division_id
      LEFT JOIN positions p ON p.id = e.position_id
      WHERE e.id = $1 AND e.company_id = $2
    `, [employeeId, companyId]);

    if (employeeResult.rows.length === 0) {
      throw new Error('Karyawan tidak ditemukan');
    }

    const employee = employeeResult.rows[0];

    // Get attendance records for the month
    const attendanceResult = await query(`
      SELECT
        a.*,
        s.name as shift_name,
        s.start_time,
        s.end_time
      FROM attendance a
      LEFT JOIN shifts s ON s.id = a.shift_id
      WHERE a.employee_id = $1
        AND EXTRACT(MONTH FROM a.check_in) = $2
        AND EXTRACT(YEAR FROM a.check_in) = $3
      ORDER BY a.check_in ASC
    `, [employeeId, month, year]);

    const attendances = attendanceResult.rows;

    // Calculate statistics
    const stats = {
      total_days: attendances.length,
      hadir: attendances.filter(a => a.status === 'HADIR').length,
      terlambat: attendances.filter(a => a.status === 'TERLAMBAT').length,
      izin: attendances.filter(a => a.status === 'IZIN').length,
      sakit: attendances.filter(a => a.status === 'SAKIT').length,
      alpha: attendances.filter(a => a.status === 'ALPHA').length,
    };

    // Get overtime summary for the month
    const overtimeResult = await query(`
      SELECT
        COUNT(*) as total_overtime,
        COALESCE(SUM(duration_hours), 0) as total_hours
      FROM overtime
      WHERE employee_id = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND EXTRACT(YEAR FROM date) = $3
        AND status = 'approved'
    `, [employeeId, month, year]);

    const overtime = overtimeResult.rows[0];

    // Get company info
    const companyResult = await query(`
      SELECT name, address, phone
      FROM companies
      WHERE id = $1
    `, [companyId]);

    const company = companyResult.rows[0];

    // Get month name in Indonesian
    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return {
      company,
      employee,
      attendances,
      stats,
      overtime,
      period: {
        month: monthNames[month],
        year,
        month_num: month
      }
    };
  }

  // Get all employees with attendance summary for a month
  async getEmployeeSlipsList(companyId, month, year) {
    const result = await query(`
      SELECT
        e.id,
        e.name,
        e.employee_code as employee_id,
        d.name as division_name,
        COUNT(a.id) as total_attendance,
        COUNT(CASE WHEN a.status = 'HADIR' THEN 1 END) as hadir_count,
        COUNT(CASE WHEN a.status = 'TERLAMBAT' THEN 1 END) as terlambat_count
      FROM employees e
      LEFT JOIN divisions d ON d.id = e.division_id
      LEFT JOIN attendance a ON a.employee_id = e.id
        AND EXTRACT(MONTH FROM a.check_in) = $1
        AND EXTRACT(YEAR FROM a.check_in) = $2
      WHERE e.company_id = $3
      GROUP BY e.id, e.name, e.employee_code, d.name
      ORDER BY e.name
    `, [month, year, companyId]);

    return result.rows;
  }

  // Generate detailed attendance report for all employees
  async getAllEmployeesReport(companyId, month, year) {
    const employees = await query(`
      SELECT e.id, e.name, e.employee_code as employee_id, d.name as division_name, p.name as position_name
      FROM employees e
      LEFT JOIN divisions d ON d.id = e.division_id
      LEFT JOIN positions p ON p.id = e.position_id
      WHERE e.company_id = $1
      ORDER BY e.name
    `, [companyId]);

    const report = [];

    for (const emp of employees.rows) {
      const slipData = await this.getAttendanceSlip(emp.id, month, year, companyId);
      report.push({
        employee: emp,
        stats: slipData.stats,
        overtime: slipData.overtime
      });
    }

    return report;
  }
}

module.exports = new SlipService();
