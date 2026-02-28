-- Add shift_id column to attendance table
-- This should be run AFTER attendance table already exists

-- Add shift_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance'
    AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for shift lookups
CREATE INDEX IF NOT EXISTS idx_attendance_shift_id ON attendance(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkin_shift ON attendance(shift_id, check_in);

-- Update comment
COMMENT ON COLUMN attendance.shift_id IS 'Shift reference for this attendance record';
