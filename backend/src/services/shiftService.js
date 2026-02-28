const { query } = require('../config/db');

class ShiftService {
  // Get all shifts for a company
  async getShifts(companyId) {
    const result = await query(`
      SELECT s.*,
        COUNT(DISTINCT es.employee_id) as employee_count
      FROM shifts s
      LEFT JOIN employee_shifts es ON es.shift_id = s.id
      WHERE s.company_id = $1
      GROUP BY s.id
      ORDER BY s.sort_order ASC, s.start_time ASC
    `, [companyId]);

    return result.rows;
  }

  // Get shift by ID
  async getShiftById(shiftId, companyId) {
    const result = await query(
      'SELECT * FROM shifts WHERE id = $1 AND company_id = $2',
      [shiftId, companyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Shift not found');
    }

    return result.rows[0];
  }

  // Create shift
  async createShift(companyId, shiftData) {
    const { name, description, start_time, end_time, break_duration_minutes = 0, sort_order = 0 } = shiftData;

    if (!name || !start_time || !end_time) {
      throw new Error('Nama, jam mulai, dan jam selesai wajib diisi');
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      throw new Error('Format jam salah. Gunakan HH:MM (contoh: 06:00, 14:00)');
    }

    // Check if shift name already exists
    const existing = await query(
      'SELECT id FROM shifts WHERE company_id = $1 AND name = $2',
      [companyId, name]
    );

    if (existing.rows.length > 0) {
      throw new Error('Shift dengan nama ini sudah ada');
    }

    const result = await query(`
      INSERT INTO shifts (company_id, name, description, start_time, end_time, break_duration_minutes, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [companyId, name, description, start_time, end_time, break_duration_minutes, sort_order]);

    return result.rows[0];
  }

  // Update shift
  async updateShift(shiftId, companyId, shiftData) {
    const { name, description, start_time, end_time, break_duration_minutes, is_active, sort_order } = shiftData;

    // Get existing shift
    const existing = await this.getShiftById(shiftId, companyId);

    // Check new name uniqueness if changed
    if (name && name !== existing.name) {
      const duplicate = await query(
        'SELECT id FROM shifts WHERE company_id = $1 AND name = $2 AND id != $3',
        [companyId, name, shiftId]
      );

      if (duplicate.rows.length > 0) {
        throw new Error('Shift dengan nama ini sudah ada');
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramCount++}`);
      values.push(end_time);
    }
    if (break_duration_minutes !== undefined) {
      updates.push(`break_duration_minutes = $${paramCount++}`);
      values.push(break_duration_minutes);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = CURRENT_DATE`);
    values.push(shiftId);
    values.push(companyId);

    const queryStr = `
      UPDATE shifts
      SET ${updates.join(', ')}
      WHERE id = $${values.length - 1} AND company_id = $${values.length}
      RETURNING *
    `;

    const result = await query(queryStr, values);
    return result.rows[0];
  }

  // Delete shift
  async deleteShift(shiftId, companyId) {
    await query('DELETE FROM shifts WHERE id = $1 AND company_id = $2', [shiftId, companyId]);
  }

  // Get employee shift for a specific date
  async getEmployeeShift(employeeId, date) {
    const result = await query(`
      SELECT es.*, s.name as shift_name, s.start_time, s.end_time, s.break_duration_minutes
      FROM employee_shifts es
      JOIN shifts s ON s.id = es.shift_id
      WHERE es.employee_id = $1
        AND es.effective_date <= $2
      ORDER BY es.effective_date DESC
      LIMIT 1
    `, [employeeId, date]);

    return result.rows[0] || null;
  }

  // Assign shift to employee
  async assignShift(employeeId, shiftId, effectiveDate) {
    // Check if shift exists
    const shiftResult = await query('SELECT * FROM shifts WHERE id = $1', [shiftId]);
    if (shiftResult.rows.length === 0) {
      throw new Error('Shift tidak ditemukan');
    }

    // Insert or update assignment
    await query(`
      INSERT INTO employee_shifts (employee_id, shift_id, effective_date)
      VALUES ($1, $2, $3)
      ON CONFLICT (employee_id, effective_date)
      DO UPDATE SET shift_id = $2
    `, [employeeId, shiftId, effectiveDate]);
  }

  // Get employees with their shifts
  async getEmployeesWithShifts(companyId) {
    const result = await query(`
      SELECT
        e.id,
        e.name,
        e.employee_code as employee_id,
        es.shift_id,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        es.effective_date
      FROM employees e
      LEFT JOIN employee_shifts es ON es.employee_id = e.id AND es.effective_date <= CURRENT_DATE
      LEFT JOIN shifts s ON s.id = es.shift_id
      WHERE e.company_id = $1
      ORDER BY e.name ASC
    `, [companyId]);

    return result.rows;
  }
}

module.exports = new ShiftService();
