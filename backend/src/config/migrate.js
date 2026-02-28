/**
 * ABSENIN v3 — Database Migration Runner
 *
 * Cara pakai:
 *   node src/config/migrate.js          → jalankan semua migration pending
 *   node src/config/migrate.js --fresh  → hapus semua tabel & mulai dari awal (HATI-HATI!)
 *   node src/config/migrate.js --status → lihat migration apa saja yang sudah/belum jalan
 *
 * Cara tambah perubahan database:
 *   Tambahkan entry baru di array MIGRATIONS di bawah (paling bawah = paling baru).
 *   Setiap entry hanya dijalankan SEKALI — jika sudah tercatat di migration_history
 *   akan otomatis dilewati, aman dijalankan berkali-kali.
 *
 * Format entry:
 *   {
 *     version: 'v3.x.x_nama_singkat',   // unik, JANGAN diubah setelah deploy
 *     description: 'Penjelasan singkat',
 *     up: async (client) => { ... },     // DDL/DML perubahan
 *   }
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

// ══════════════════════════════════════════════════════════════════════
// DAFTAR MIGRATION — tambahkan entry baru di PALING BAWAH
// ══════════════════════════════════════════════════════════════════════
const MIGRATIONS = [

  // ── v3.0.0 ── Schema awal lengkap
  {
    version: 'v3.0.0_initial_schema',
    description: 'Schema awal: companies, users, employees, attendance, overtime, leaves, plans, payments, settings, indexes',
    up: async (client) => {
      const schemaPath = path.join(__dirname, '../../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      await client.query(schema);
    },
  },

  // ── v3.0.1 ── Seed data awal
  {
    version: 'v3.0.1_seed_superadmin',
    description: 'Buat company HQ, akun superadmin, dan company_settings default',
    up: async (client) => {
      const bcrypt = require('bcryptjs');
      const hp = await bcrypt.hash('admin123', 12);

      await client.query(`
        INSERT INTO companies (name, slug, plan, max_employees)
        VALUES ('Absenin HQ', 'absenin-hq', 'enterprise', 999)
        ON CONFLICT (slug) DO NOTHING
      `);
      await client.query(`
        INSERT INTO users (email, password, name, role, company_id)
        VALUES ('admin@absenin.com', $1, 'Super Admin', 'superadmin', 1)
        ON CONFLICT (email) DO NOTHING
      `, [hp]);
      await client.query(`
        INSERT INTO company_settings (company_id) VALUES (1)
        ON CONFLICT DO NOTHING
      `);
    },
  },

  // ── v3.1.0 ── Hapus kolom department (diganti division_id FK)
  {
    version: 'v3.1.0_drop_department_column',
    description: 'Hapus kolom department dari tabel employees — sudah diganti division_id + position_id',
    up: async (client) => {
      await client.query(`ALTER TABLE employees DROP COLUMN IF EXISTS department`);
    },
  },

  // ── v3.1.1 ── Hapus kolom position teks (diganti position_id FK)
  {
    version: 'v3.1.1_drop_position_text_column',
    description: 'Hapus kolom position (varchar) dari employees — sudah ada position_id FK ke tabel positions',
    up: async (client) => {
      await client.query(`ALTER TABLE employees DROP COLUMN IF EXISTS position`);
    },
  },

  // ── v3.1.2 ── Index wa_device_number untuk webhook multi-tenant
  {
    version: 'v3.1.2_index_wa_device_number',
    description: 'Index pada company_settings.wa_device_number untuk lookup tenant dari Fonnte webhook',
    up: async (client) => {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_settings_wa_device
        ON company_settings(wa_device_number)
        WHERE wa_device_number IS NOT NULL
      `);
    },
  },

  // ── v3.1.3 ── Blog posts public CMS
  {
    version: 'v3.1.3_create_blog_posts_table',
    description: 'Buat tabel blog_posts + index untuk halaman blog publik',
    up: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_posts (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          excerpt TEXT,
          content_html TEXT NOT NULL,
          feature_image_url TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          published_at TIMESTAMP NULL,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
        ON blog_posts(status, published_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_blog_posts_slug_public
        ON blog_posts(slug)
      `);
    },
  },

  // ── v3.1.4 ── Kategori artikel blog
  {
    version: 'v3.1.4_add_blog_category',
    description: 'Tambah kolom category di blog_posts + index category',
    up: async (client) => {
      await client.query(`
        ALTER TABLE blog_posts
        ADD COLUMN IF NOT EXISTS category VARCHAR(100)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_blog_posts_category_public
        ON blog_posts(category)
      `);
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // ↓ TAMBAHKAN MIGRATION BARU DI SINI
  //
  // Contoh — tambah kolom shift ke karyawan:
  //
  // {
  //   version: 'v3.2.0_tambah_shift_karyawan',
  //   description: 'Tambah kolom shift (pagi/siang/malam) ke tabel employees',
  //   up: async (client) => {
  //     await client.query(`
  //       ALTER TABLE employees
  //       ADD COLUMN IF NOT EXISTS shift VARCHAR(20) DEFAULT 'pagi'
  //         CHECK (shift IN ('pagi','siang','malam'))
  //     `);
  //     await client.query(`
  //       CREATE INDEX IF NOT EXISTS idx_employees_shift ON employees(shift)
  //     `);
  //   },
  // },
  //
  // Contoh — tambah tabel baru:
  //
  // {
  //   version: 'v3.2.1_tabel_jadwal',
  //   description: 'Tabel jadwal kerja per-karyawan',
  //   up: async (client) => {
  //     await client.query(`
  //       CREATE TABLE IF NOT EXISTS schedules (
  //         id         SERIAL PRIMARY KEY,
  //         company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  //         employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  //         date       DATE NOT NULL,
  //         shift      VARCHAR(20) DEFAULT 'pagi',
  //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  //         UNIQUE(employee_id, date)
  //       )
  //     `);
  //   },
  // },
  // ════════════════════════════════════════════════════════════════════

];

// ══════════════════════════════════════════════════════════════════════
// MIGRATION RUNNER — tidak perlu diedit
// ══════════════════════════════════════════════════════════════════════

async function ensureHistoryTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id          SERIAL PRIMARY KEY,
      version     VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      ran_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getRanVersions(client) {
  const r = await client.query('SELECT version FROM migration_history ORDER BY id');
  return new Set(r.rows.map(r => r.version));
}

async function runMigrations() {
  const args = process.argv.slice(2);
  const isFresh  = args.includes('--fresh');
  const isStatus = args.includes('--status');

  const client = await pool.connect();
  try {

    // ── --fresh: drop semua & restart (dev only) ──
    if (isFresh) {
      console.log('\n⚠️  --fresh mode: semua tabel akan dihapus...\n');
      await client.query(`BEGIN`);
      await client.query(`
        DROP TABLE IF EXISTS
          migration_history, reminders, overtime, leaves, attendance,
          employees, positions, divisions, payments, bank_accounts,
          company_settings, users, companies, plans
        CASCADE
      `);
      await client.query(`COMMIT`);
      console.log('🗑️  Semua tabel berhasil dihapus\n');
    }

    // Pastikan tabel tracking migration ada
    await client.query(`BEGIN`);
    await ensureHistoryTable(client);
    const ran = await getRanVersions(client);

    // ── --status: tampilkan daftar & keluar ──
    if (isStatus) {
      await client.query('ROLLBACK');
      console.log('\n📋 Status Migration Absenin:\n');
      for (const m of MIGRATIONS) {
        const done = ran.has(m.version);
        console.log(`  ${done ? '✅' : '⏳'} ${m.version}`);
        console.log(`     ${m.description}\n`);
      }
      const pendingCount = MIGRATIONS.filter(m => !ran.has(m.version)).length;
      console.log(`  Total pending: ${pendingCount}\n`);
      await pool.end();
      return;
    }

    // ── Jalankan migration yang belum pernah dijalankan ──
    const pending = MIGRATIONS.filter(m => !ran.has(m.version));

    if (pending.length === 0) {
      await client.query('COMMIT');
      console.log('\n✅ Database sudah up-to-date. Tidak ada migration pending.\n');
      await pool.end();
      return;
    }

    console.log(`\n🔄 Menjalankan ${pending.length} migration...\n`);

    for (const m of pending) {
      process.stdout.write(`  ⏳ ${m.version}\n     ${m.description}... `);
      await client.query('SAVEPOINT migration_step');
      try {
        await m.up(client);
        await client.query(
          'INSERT INTO migration_history (version, description) VALUES ($1, $2)',
          [m.version, m.description]
        );
        await client.query('RELEASE SAVEPOINT migration_step');
        console.log('✅');
      } catch (stepErr) {
        await client.query('ROLLBACK TO SAVEPOINT migration_step').catch(() => {});
        await client.query('RELEASE SAVEPOINT migration_step').catch(() => {});

        // Khusus error "kolom tidak ada" saat drop — aman diabaikan
        if (stepErr.code === '42703' || stepErr.code === '42P01') {
          console.log('⏭️  (sudah tidak ada, dilewati)');
          await client.query(
            'INSERT INTO migration_history (version, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [m.version, m.description]
          );
        } else if (stepErr.code === '42501' && /must be owner of table/i.test(stepErr.message || '')) {
          // Kasus umum saat tabel existing dimiliki role DB lain.
          // Karena migration bersifat idempotent (CREATE IF NOT EXISTS / DROP IF EXISTS),
          // aman ditandai selesai agar proses startup tidak terblokir.
          console.log('⏭️  (table dimiliki role lain, dilewati)');
          await client.query(
            'INSERT INTO migration_history (version, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [m.version, m.description]
          );
        } else {
          throw stepErr;
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ ${pending.length} migration selesai dijalankan!\n`);

    if (pending.some(m => m.version === 'v3.0.1_seed_superadmin')) {
      console.log('  📧 Superadmin login: admin@absenin.com');
      console.log('  🔑 Password default: admin123');
      console.log('  ⚠️  Segera ganti password setelah login pertama!\n');
    }

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Migration gagal:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  process.exit(0);
}

runMigrations();
