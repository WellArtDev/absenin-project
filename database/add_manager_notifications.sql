-- Automatic Manager Notifications System
-- Send WhatsApp notifications to managers for attendance events

-- 1. Add manager contacts to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"late":true,"absent":true,"leave":true,"overtime":true}'::jsonb;

-- 2. Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'late', 'absent', 'leave_request', 'overtime_request', 'overtime_approved'
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT TRUE,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create notification triggers table (optional scheduling)
CREATE TABLE IF NOT EXISTS notification_schedules (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  schedule_type VARCHAR(50) NOT NULL, -- 'daily_summary', 'weekly_summary'
  schedule_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_company ON notification_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_employee ON notification_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type ON notification_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_company ON notification_schedules(company_id);

-- Comments
COMMENT ON COLUMN companies.manager_name IS 'Manager name for notifications';
COMMENT ON COLUMN companies.manager_phone IS 'Manager WhatsApp number for notifications (format: 628...)';
COMMENT ON COLUMN companies.notification_settings IS 'Notification preferences: which events to notify';
COMMENT ON TABLE notification_logs IS 'History of all notifications sent to managers';
COMMENT ON TABLE notification_schedules IS 'Scheduled notifications (daily/weekly summaries)';
