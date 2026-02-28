-- QR Code Attendance System
-- Generate QR codes per shift/day for easy check-in

-- 1. Create QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  code VARCHAR(255) NOT NULL UNIQUE, -- Unique QR code string
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  scan_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_qr_per_company_date UNIQUE (company_id, code, date)
);

-- 2. Create QR scan logs table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id BIGSERIAL PRIMARY KEY,
  qr_code_id INTEGER NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  attendance_id INTEGER REFERENCES attendance(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_company_date ON qr_codes(company_id, date);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(company_id, is_active, date);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr ON qr_scan_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_employee ON qr_scan_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at ON qr_scan_logs(scanned_at);

-- Comments
COMMENT ON TABLE qr_codes IS 'Generated QR codes for attendance check-in';
COMMENT ON TABLE qr_scan_logs IS 'Logs of QR code scans by employees';
COMMENT ON COLUMN qr_codes.code IS 'Unique code embedded in QR image';
COMMENT ON COLUMN qr_codes.expires_at IS 'Optional expiration time for QR code';
