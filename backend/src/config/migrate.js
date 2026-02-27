const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('🔄 Running ABSENIN v3.0 migration...');
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('✅ Schema created');

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create default company
    await pool.query(`INSERT INTO companies (name, slug, plan, max_employees) 
      VALUES ('Absenin HQ', 'absenin-hq', 'enterprise', 999) ON CONFLICT DO NOTHING`);
    
    // Create superadmin
    await pool.query(`INSERT INTO users (email, password, name, role, company_id) 
      VALUES ('admin@absenin.com', $1, 'Super Admin', 'superadmin', 1) ON CONFLICT (email) DO NOTHING`, [hashedPassword]);
    
    // Create company settings
    await pool.query(`INSERT INTO company_settings (company_id) VALUES (1) ON CONFLICT DO NOTHING`);

    console.log('✅ Migration complete!');
    console.log('📧 Superadmin: admin@absenin.com / admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
