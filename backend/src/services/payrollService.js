const { query } = require('../config/db');

class PayrollService {
  async ensurePayrollColumns() {
    // Make payroll module forward-compatible on older DBs.
    await query(`
      ALTER TABLE IF EXISTS payroll_settings
      ADD COLUMN IF NOT EXISTS include_weekends BOOLEAN DEFAULT false
    `);
    await query(`
      ALTER TABLE IF EXISTS payroll_settings
      ADD COLUMN IF NOT EXISTS cutoff_day INTEGER DEFAULT 25
    `);
    await query(`
      ALTER TABLE IF EXISTS payroll_settings
      ADD COLUMN IF NOT EXISTS bpjs_health_employee_percent DECIMAL(5,2) DEFAULT 0
    `);
    await query(`
      ALTER TABLE IF EXISTS payroll_settings
      ADD COLUMN IF NOT EXISTS bpjs_employment_employee_percent DECIMAL(5,2) DEFAULT 0
    `);
    await query(`
      ALTER TABLE IF EXISTS payroll_settings
      ADD COLUMN IF NOT EXISTS pph21_percent DECIMAL(5,2) DEFAULT 0
    `);
    await query(`
      ALTER TABLE IF EXISTS payroll_records
      ADD COLUMN IF NOT EXISTS bpjs_deductions DECIMAL(15,2) DEFAULT 0
    `);
    await query(`
      ALTER TABLE IF EXISTS payroll_records
      ADD COLUMN IF NOT EXISTS pph21_deductions DECIMAL(15,2) DEFAULT 0
    `);
  }

  // Get payroll settings for a company
  async getPayrollSettings(companyId) {
    await this.ensurePayrollColumns();

    const result = await query(`
      SELECT * FROM payroll_settings WHERE company_id = $1
    `, [companyId]);

    if (result.rows.length === 0) {
      // Create default settings
      const inserted = await query(`
        INSERT INTO payroll_settings (
          company_id,
          overtime_rate_per_hour,
          late_deduction_per_minute,
          absent_deduction_per_day,
          bpjs_health_employee_percent,
          bpjs_employment_employee_percent,
          pph21_percent
        )
        VALUES ($1, 0, 0, 0, 0, 0, 0)
        RETURNING *
      `, [companyId]);
      return inserted.rows[0];
    }

    return result.rows[0];
  }

  // Update payroll settings
  async updatePayrollSettings(companyId, settings) {
    await this.ensurePayrollColumns();

    const {
      overtime_rate_per_hour,
      late_deduction_per_minute,
      absent_deduction_per_day,
      include_weekends,
      cutoff_day,
      bpjs_health_employee_percent,
      bpjs_employment_employee_percent,
      pph21_percent
    } = settings;

    const result = await query(`
      INSERT INTO payroll_settings (
        company_id, overtime_rate_per_hour, late_deduction_per_minute, absent_deduction_per_day,
        include_weekends, cutoff_day, bpjs_health_employee_percent, bpjs_employment_employee_percent, pph21_percent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (company_id)
      DO UPDATE SET
        overtime_rate_per_hour = COALESCE(EXCLUDED.overtime_rate_per_hour, payroll_settings.overtime_rate_per_hour),
        late_deduction_per_minute = COALESCE(EXCLUDED.late_deduction_per_minute, payroll_settings.late_deduction_per_minute),
        absent_deduction_per_day = COALESCE(EXCLUDED.absent_deduction_per_day, payroll_settings.absent_deduction_per_day),
        include_weekends = COALESCE(EXCLUDED.include_weekends, payroll_settings.include_weekends),
        cutoff_day = COALESCE(EXCLUDED.cutoff_day, payroll_settings.cutoff_day),
        bpjs_health_employee_percent = COALESCE(EXCLUDED.bpjs_health_employee_percent, payroll_settings.bpjs_health_employee_percent),
        bpjs_employment_employee_percent = COALESCE(EXCLUDED.bpjs_employment_employee_percent, payroll_settings.bpjs_employment_employee_percent),
        pph21_percent = COALESCE(EXCLUDED.pph21_percent, payroll_settings.pph21_percent)
      RETURNING *
    `, [
      companyId,
      overtime_rate_per_hour,
      late_deduction_per_minute,
      absent_deduction_per_day,
      include_weekends,
      cutoff_day,
      bpjs_health_employee_percent,
      bpjs_employment_employee_percent,
      pph21_percent
    ]);

    return result.rows[0];
  }

  // Calculate payroll for an employee for a period
  async calculateEmployeePayroll(employeeId, month, year, companyId) {
    await this.ensurePayrollColumns();

    // Get employee with position
    const empResult = await query(`
      SELECT e.*, p.base_salary, p.name as position_name
      FROM employees e
      LEFT JOIN positions p ON p.id = e.position_id
      WHERE e.id = $1 AND e.company_id = $2
    `, [employeeId, companyId]);

    if (empResult.rows.length === 0) {
      throw new Error('Karyawan tidak ditemukan');
    }

    const employee = empResult.rows[0];

    // Get payroll settings
    const settings = await this.getPayrollSettings(companyId);

    // Calculate period dates
    const cutoffDay = settings.cutoff_day || 25;
    const year2 = month === 12 ? year + 1 : year;
    const month2 = month === 12 ? 1 : month + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year2}-${String(month2).padStart(2, '0')}-${String(Math.min(cutoffDay, 28)).padStart(2, '0')}`;

    // Get attendance data
    const attResult = await query(`
      SELECT
        a.*,
        EXTRACT(EPOCH FROM (a.check_out - a.check_in))/3600 as work_hours
      FROM attendance a
      WHERE a.employee_id = $1
        AND a.check_in >= $2::date
        AND a.check_in < $3::date
    `, [employeeId, startDate, endDate]);

    // Calculate statistics
    let totalLateMinutes = 0;
    let absentDays = 0;
    let presentDays = 0;

    attResult.rows.forEach(att => {
      const workStart = '08:00';
      const checkInTime = att.check_in ? new Date(att.check_in).toLocaleTimeString('id-ID', { hour12: false }) : null;

      if (att.status === 'HADIR' || att.status === 'TERLAMBAT') {
        presentDays++;

        // Calculate late minutes
        if (checkInTime && checkInTime > workStart) {
          const [hours, minutes] = checkInTime.split(':').map(Number);
          const [wh, wm] = workStart.split(':').map(Number);
          const lateMinutes = (hours - wh) * 60 + (minutes - wm);
          if (lateMinutes > 0) {
            totalLateMinutes += lateMinutes;
          }
        }
      } else if (att.status === 'ALPHA') {
        absentDays++;
      }
    });

    // Get approved overtime
    const otResult = await query(`
      SELECT COALESCE(SUM(COALESCE(duration_minutes, 0)) / 60.0, 0) as total_overtime_hours
      FROM overtime
      WHERE employee_id = $1
        AND date >= $2::date
        AND date < $3::date
        AND status = 'approved'
    `, [employeeId, startDate, endDate]);

    const overtimeHours = parseFloat(otResult.rows[0].total_overtime_hours) || 0;

    // Calculate amounts
    const baseSalary = parseFloat(employee.base_salary) || 0;
    const overtimeRate = parseFloat(settings.overtime_rate_per_hour) || 0;
    const lateDeductionRate = parseFloat(settings.late_deduction_per_minute) || 0;
    const absentDeductionRate = parseFloat(settings.absent_deduction_per_day) || 0;
    const bpjsHealthRate = parseFloat(settings.bpjs_health_employee_percent) || 0;
    const bpjsEmploymentRate = parseFloat(settings.bpjs_employment_employee_percent) || 0;
    const pph21Rate = parseFloat(settings.pph21_percent) || 0;

    const overtimePay = overtimeHours * overtimeRate;
    const lateDeductions = totalLateMinutes * lateDeductionRate;
    const absentDeductions = absentDays * absentDeductionRate;
    const bpjsDeductions = baseSalary * ((bpjsHealthRate + bpjsEmploymentRate) / 100);

    const totalEarnings = baseSalary + overtimePay;
    const taxableIncome = Math.max(totalEarnings - lateDeductions - absentDeductions - bpjsDeductions, 0);
    const pph21Deductions = taxableIncome * (pph21Rate / 100);
    const totalDeductions = lateDeductions + absentDeductions + bpjsDeductions + pph21Deductions;
    const netSalary = totalEarnings - totalDeductions;

    return {
      employee_ref_id: employeeId,
      employee_name: employee.name,
      employee_id: employee.employee_code,
      position: employee.position_name,
      base_salary: baseSalary,
      overtime_hours: overtimeHours,
      overtime_pay: overtimePay,
      allowance: 0,
      bonus: 0,
      late_deductions: lateDeductions,
      absent_deductions: absentDeductions,
      bpjs_deductions: bpjsDeductions,
      pph21_deductions: pph21Deductions,
      other_deductions: 0,
      total_deductions: totalDeductions,
      total_earnings: totalEarnings,
      net_salary: netSalary,
      summary: {
        present_days: presentDays,
        absent_days: absentDays,
        total_late_minutes: totalLateMinutes
      }
    };
  }

  // Get or create payroll period
  async getPayrollPeriod(companyId, month, year) {
    const result = await query(`
      SELECT * FROM payroll_periods
      WHERE company_id = $1 AND month = $2 AND year = $3
    `, [companyId, month, year]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new period
    const cutoffDay = 25;
    const year2 = month === 12 ? year + 1 : year;
    const month2 = month === 12 ? 1 : month + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year2}-${String(month2).padStart(2, '0')}-${String(cutoffDay).padStart(2, '0')}`;

    const inserted = await query(`
      INSERT INTO payroll_periods (company_id, month, year, start_date, end_date)
      VALUES ($1, $2, $3, $4::date, $5::date)
      RETURNING *
    `, [companyId, month, year, startDate, endDate]);

    return inserted.rows[0];
  }

  // Calculate payroll for all employees in a period
  async calculatePeriodPayroll(periodId, companyId) {
    await this.ensurePayrollColumns();

    // Get period info
    const periodResult = await query(`
      SELECT * FROM payroll_periods WHERE id = $1 AND company_id = $2
    `, [periodId, companyId]);

    if (periodResult.rows.length === 0) {
      throw new Error('Periode tidak ditemukan');
    }

    const period = periodResult.rows[0];

    // Get all employees
    const empResult = await query(`
      SELECT id FROM employees WHERE company_id = $1 AND is_active = true
    `, [companyId]);

    const employees = empResult.rows;
    const payrollRecords = [];

    let totalAmount = 0;

    for (const emp of employees) {
      const payroll = await this.calculateEmployeePayroll(emp.id, period.month, period.year, companyId);

      // Insert or update record
      const recordResult = await query(`
        INSERT INTO payroll_records (
          period_id, employee_id, base_salary, overtime_hours, overtime_pay,
          allowance, bonus, late_deductions, absent_deductions, bpjs_deductions, pph21_deductions, other_deductions,
          total_deductions, total_earnings, net_salary, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (employee_id, period_id)
        DO UPDATE SET
          base_salary = EXCLUDED.base_salary,
          overtime_hours = EXCLUDED.overtime_hours,
          overtime_pay = EXCLUDED.overtime_pay,
          late_deductions = EXCLUDED.late_deductions,
          absent_deductions = EXCLUDED.absent_deductions,
          bpjs_deductions = EXCLUDED.bpjs_deductions,
          pph21_deductions = EXCLUDED.pph21_deductions,
          total_deductions = EXCLUDED.total_deductions,
          total_earnings = EXCLUDED.total_earnings,
          net_salary = EXCLUDED.net_salary
        RETURNING *
      `, [periodId, emp.id, payroll.base_salary, payroll.overtime_hours, payroll.overtime_pay,
          payroll.allowance, payroll.bonus, payroll.late_deductions, payroll.absent_deductions,
          payroll.bpjs_deductions, payroll.pph21_deductions, payroll.other_deductions,
          payroll.total_deductions, payroll.total_earnings, payroll.net_salary,
          `Present: ${payroll.summary.present_days} days, Late: ${Math.round(payroll.summary.total_late_minutes)} min, Absent: ${payroll.summary.absent_days} days`
      ]);

      payrollRecords.push(recordResult.rows[0]);
      totalAmount += parseFloat(payroll.net_salary);
    }

    // Update period
    await query(`
      UPDATE payroll_periods
      SET total_employees = $2,
          total_amount = $3,
          status = 'calculated'
      WHERE id = $1
    `, [periodId, employees.length, totalAmount]);

    return { period, records: payrollRecords, total_amount: totalAmount };
  }

  // Get payroll records for a period
  async getPayrollRecords(periodId, companyId) {
    await this.ensurePayrollColumns();

    const result = await query(`
      SELECT pr.*,
        e.name as employee_name,
        e.employee_code as employee_code,
        p.name as position_name,
        d.name as division_name
      FROM payroll_records pr
      JOIN employees e ON e.id = pr.employee_id
      LEFT JOIN positions p ON p.id = e.position_id
      LEFT JOIN divisions d ON d.id = e.division_id
      JOIN payroll_periods pp ON pp.id = pr.period_id
      WHERE pr.period_id = $1 AND pp.company_id = $2
      ORDER BY e.name
    `, [periodId, companyId]);

    return result.rows;
  }

  // Get payroll periods
  async getPayrollPeriods(companyId) {
    const result = await query(`
      SELECT pp.*,
        COUNT(pr.id) as employee_count
      FROM payroll_periods pp
      LEFT JOIN payroll_records pr ON pr.period_id = pp.id
      WHERE pp.company_id = $1
      GROUP BY pp.id
      ORDER BY pp.year DESC, pp.month DESC
    `, [companyId]);

    return result.rows;
  }

  // Update payroll record (for manual adjustments)
  async updatePayrollRecord(recordId, companyId, updates) {
    await this.ensurePayrollColumns();

    const { allowance, bonus, other_deductions, notes } = updates;

    const recResult = await query(`
      SELECT pr.* FROM payroll_records pr
      JOIN payroll_periods pp ON pp.id = pr.period_id
      WHERE pr.id = $1 AND pp.company_id = $2
    `, [recordId, companyId]);

    if (recResult.rows.length === 0) {
      throw new Error('Payroll record tidak ditemukan');
    }

    const record = recResult.rows[0];

    // Calculate new totals
    const newAllowance = allowance !== undefined ? parseFloat(allowance) : parseFloat(record.allowance);
    const newBonus = bonus !== undefined ? parseFloat(bonus) : parseFloat(record.bonus);
    const newOtherDeductions = other_deductions !== undefined ? parseFloat(other_deductions) : parseFloat(record.other_deductions);

    const newTotalEarnings = parseFloat(record.total_earnings) + newAllowance + newBonus - parseFloat(record.allowance) - parseFloat(record.bonus);
    const newTotalDeductions = parseFloat(record.total_deductions) + newOtherDeductions - parseFloat(record.other_deductions);
    const newNetSalary = newTotalEarnings - newTotalDeductions;

    const result = await query(`
      UPDATE payroll_records
      SET allowance = $1,
          bonus = $2,
          other_deductions = $3,
          total_deductions = $4,
          total_earnings = $5,
          net_salary = $6,
          notes = COALESCE($7, notes)
      WHERE id = $8
      RETURNING *
    `, [newAllowance, newBonus, newOtherDeductions, newTotalDeductions, newTotalEarnings, newNetSalary, notes, recordId]);

    return result.rows[0];
  }

  // Approve payroll period
  async approvePayrollPeriod(periodId, companyId) {
    await query(`
      UPDATE payroll_periods
      SET status = 'approved'
      WHERE id = $1 AND company_id = $2
    `, [periodId, companyId]);
  }

  // Mark payroll as paid
  async markPayrollAsPaid(periodId, companyId) {
    await query(`
      UPDATE payroll_periods
      SET status = 'paid'
      WHERE id = $1 AND company_id = $2
    `, [periodId, companyId]);
  }
}

module.exports = new PayrollService();
