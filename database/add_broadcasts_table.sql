-- Broadcasts table for sending WhatsApp messages to employees
CREATE TABLE IF NOT EXISTS broadcasts (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  target_type VARCHAR(20) NOT NULL DEFAULT 'all', -- 'all', 'division', 'position'
  division_id INTEGER REFERENCES divisions(id) ON DELETE SET NULL,
  position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
  image_url TEXT,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT check_target_type_valid CHECK (target_type IN ('all', 'division', 'position'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_broadcasts_company_id ON broadcasts(company_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_division_id ON broadcasts(division_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_position_id ON broadcasts(position_id);
