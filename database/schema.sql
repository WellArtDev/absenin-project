-- ========================================
-- ABSENIN v3.0 - Complete Database Schema
-- Multi-Tenant + HRM + Payment + GPS
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 🏢 Companies (Tenants)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    plan_expires_at TIMESTAMP,
    max_employees INT DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 💰 Subscription Plans (managed by superadmin)
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(12,2) DEFAULT 0,
    max_employees INT DEFAULT 10,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    duration_days INT DEFAULT 30,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 💳 Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    plan_id INT REFERENCES plans(id),
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','waiting_confirmation','confirmed','rejected','expired')),
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(255),
    transfer_proof_url TEXT,
    transfer_date TIMESTAMP,
    confirmed_by INT,
    confirmed_at TIMESTAMP,
    rejection_reason TEXT,
    invoice_number VARCHAR(100) UNIQUE,
    period_start DATE,
    period_end DATE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🏦 Bank Accounts (superadmin manages receiving accounts)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 👤 Users (Admin/Dashboard)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🏗️ Divisions
CREATE TABLE IF NOT EXISTS divisions (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)
);

-- 💼 Positions
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    division_id INT REFERENCES divisions(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_salary DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, division_id, name)
);

-- 👷 Employees (WhatsApp Users) - Full HRM
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    division_id INT REFERENCES divisions(id) ON DELETE SET NULL,
    position_id INT REFERENCES positions(id) ON DELETE SET NULL,
    employment_status VARCHAR(50) DEFAULT 'tetap' CHECK (employment_status IN ('tetap','kontrak','magang','freelance')),
    start_date DATE,
    end_date DATE,
    base_salary DECIMAL(15,2) DEFAULT 0,
    ktp_number VARCHAR(20),
    npwp_number VARCHAR(25),
    birth_date DATE,
    birth_place VARCHAR(255),
    gender VARCHAR(10) CHECK (gender IN ('L','P')),
    address TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    photo_url TEXT,
    leave_balance INT DEFAULT 12,
    radius_lock_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📅 Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'HADIR' CHECK (status IN ('HADIR','TERLAMBAT','LEMBUR','IZIN','SAKIT','ALPHA')),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location_name VARCHAR(500),
    location_detail JSONB,
    checkout_latitude DECIMAL(10,8),
    checkout_longitude DECIMAL(11,8),
    checkout_location_name VARCHAR(500),
    selfie_checkin_url TEXT,
    selfie_checkout_url TEXT,
    selfie_verified BOOLEAN DEFAULT false,
    overtime_minutes INT DEFAULT 0,
    distance_meters INT,
    is_within_radius BOOLEAN,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- 🕐 Overtime / Lembur
CREATE TABLE IF NOT EXISTS overtime (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    attendance_id INT REFERENCES attendance(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    type VARCHAR(50) DEFAULT 'auto' CHECK (type IN ('auto','manual','approved')),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
    reason TEXT,
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date, type)
);

-- 🏖️ Leave / Cuti
CREATE TABLE IF NOT EXISTS leaves (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'cuti' CHECK (type IN ('cuti','sakit','izin','dinas')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT DEFAULT 1,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔔 Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'checkin',
    time TIME NOT NULL,
    message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📊 Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_id INT UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    work_start TIME DEFAULT '08:00',
    work_end TIME DEFAULT '17:00',
    late_tolerance_minutes INT DEFAULT 15,
    office_latitude DECIMAL(10,8),
    office_longitude DECIMAL(11,8),
    office_address TEXT,
    allowed_radius_meters INT DEFAULT 500,
    radius_lock_enabled BOOLEAN DEFAULT false,
    require_selfie BOOLEAN DEFAULT true,
    require_location BOOLEAN DEFAULT false,
    overtime_enabled BOOLEAN DEFAULT true,
    overtime_min_minutes INT DEFAULT 30,
    overtime_rate_multiplier DECIMAL(3,1) DEFAULT 1.5,
    overtime_max_hours INT DEFAULT 4,
    wa_api_url VARCHAR(500),
    wa_api_token VARCHAR(500),
    wa_device_number VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone_number);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_division ON employees(division_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_coords ON attendance(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_overtime_employee ON overtime(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_date ON overtime(date);
CREATE INDEX IF NOT EXISTS idx_overtime_company ON overtime(company_id);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime(status);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_company ON leaves(company_id);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_divisions_company ON divisions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_company ON positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_division ON positions(division_id);

-- Default Plans
INSERT INTO plans (name, slug, price, max_employees, duration_days, features, sort_order, description) VALUES
('Gratis', 'free', 0, 10, 0, '["attendance","selfie","gps","dashboard","export_csv"]', 1, 'Cocok untuk UMKM kecil'),
('Pro', 'pro', 99000, 50, 30, '["attendance","selfie","gps","dashboard","export_csv","overtime","leave_management","auto_reminder","radius_validation","priority_support"]', 2, 'Untuk bisnis berkembang'),
('Enterprise', 'enterprise', 299000, 999, 30, '["attendance","selfie","gps","dashboard","export_csv","overtime","leave_management","auto_reminder","radius_validation","priority_support","multi_branch","api_access","custom_branding","dedicated_support"]', 3, 'Untuk perusahaan besar')
ON CONFLICT (slug) DO NOTHING;

-- Default Bank Accounts
INSERT INTO bank_accounts (bank_name, account_number, account_name, sort_order) VALUES
('BCA', '1234567890', 'PT Absenin Indonesia', 1),
('Mandiri', '0987654321', 'PT Absenin Indonesia', 2),
('BNI', '1122334455', 'PT Absenin Indonesia', 3)
ON CONFLICT DO NOTHING;
