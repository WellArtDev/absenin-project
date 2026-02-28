-- Simple Payroll System
-- Calculate employee salaries with overtime and deductions

-- 1. Create payroll periods table
CREATE TABLE IF NOT EXISTS payroll_periods (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, calculated, approved, paid
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_employees INTEGER DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_period_per_company UNIQUE (company_id, month, year)
);

-- 2. Create payroll records table
CREATE TABLE IF NOT EXISTS payroll_records (
  id BIGSERIAL PRIMARY KEY,
  period_id INTEGER NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary DECIMAL(15, 2) NOT NULL,
  overtime_hours DECIMAL(10, 2) DEFAULT 0,
  overtime_pay DECIMAL(15, 2) DEFAULT 0,
  allowance DECIMAL(15, 2) DEFAULT 0,
  bonus DECIMAL(15, 2) DEFAULT 0,
  late_deductions DECIMAL(15, 2) DEFAULT 0,
  absent_deductions DECIMAL(15, 2) DEFAULT 0,
  other_deductions DECIMAL(15, 2) DEFAULT 0,
  total_deductions DECIMAL(15, 2) DEFAULT 0,
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  net_salary DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_employee_period UNIQUE (employee_id, period_id)
);

-- 3. Create payroll settings table
CREATE TABLE IF NOT EXISTS payroll_settings (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  overtime_rate_per_hour DECIMAL(10, 2) DEFAULT 0,
  late_deduction_per_minute DECIMAL(10, 2) DEFAULT 0,
  absent_deduction_per_day DECIMAL(15, 2) DEFAULT 0,
  include_weekends BOOLEAN DEFAULT true,
  cutoff_day INTEGER DEFAULT 25, -- Day of month for payroll cutoff
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company ON payroll_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_company ON payroll_settings(company_id);

-- Insert default settings for existing companies
INSERT INTO payroll_settings (company_id, overtime_rate_per_hour, late_deduction_per_minute, absent_deduction_per_day)
SELECT id, 0, 0, 0 FROM companies
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE payroll_periods IS 'Payroll periods (monthly) for company-wide salary processing';
COMMENT ON TABLE payroll_records IS 'Individual employee payroll records for a period';
COMMENT ON TABLE payroll_settings IS 'Company-specific payroll calculation rules';
COMMENT ON COLUMN payroll_records.base_salary IS 'Basic monthly salary from position';
COMMENT ON COLUMN payroll_records.net_salary IS 'Final take-home pay after all calculations';
