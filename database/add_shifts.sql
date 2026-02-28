-- Shift Management for multi-shift companies (pabrik, rumah sakit, retail, dll)

-- 1. Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_time TIME NOT NULL, -- e.g., '06:00:00'
  end_time TIME NOT NULL,   -- e.g., '14:00:00'
  break_duration_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_shift_name_per_company UNIQUE (company_id, name)
);

-- 2. Create employee_shift assignments
CREATE TABLE IF NOT EXISTS employee_shifts (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_employee_per_date UNIQUE (employee_id, effective_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shifts_company_id ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee_id ON employee_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_effective_date ON employee_shifts(effective_date);

-- Insert sample shifts for companies
-- This can be done by admin per company
-- Example:
-- INSERT INTO shifts (company_id, name, description, start_time, end_time, break_duration_minutes, sort_order)
-- VALUES
--   (1, 'Shift Pagi', '06:00 - 14:00', '06:00:00', '14:00:00', 60, 1),
--   (1, 'Shift Siang', '14:00 - 22:00', '14:00:00', '22:00:00', 60, 2),
--   (1, 'Shift Malam', '22:00 - 06:00', '22:00:00', '06:00:00', 60, 3);
