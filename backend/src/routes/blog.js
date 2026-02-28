const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

const ensureBlogTables = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      category VARCHAR(100),
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
  await query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category VARCHAR(100)`);
  await query('CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at ON blog_posts(status, published_at DESC)');
  await query('CREATE INDEX IF NOT EXISTS idx_blog_posts_slug_public ON blog_posts(slug)');
  await query('CREATE INDEX IF NOT EXISTS idx_blog_posts_category_public ON blog_posts(category)');
};

// Public list of published posts
router.get('/', async (req, res) => {
  try {
    await ensureBlogTables();
    const { page = 1, limit = 12, search = '' } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
    const offset = (p - 1) * l;

    const params = [];
    let pi = 1;
    let where = `WHERE bp.status = 'published'`;
    if (search) {
      where += ` AND (bp.title ILIKE $${pi} OR bp.excerpt ILIKE $${pi} OR bp.category ILIKE $${pi})`;
      params.push(`%${search}%`);
      pi += 1;
    }

    const sql = `
      SELECT
        bp.id,
        bp.title,
        bp.slug,
        bp.category,
        bp.excerpt,
        bp.feature_image_url,
        bp.published_at,
        bp.created_at,
        u.name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON u.id = bp.created_by
      ${where}
      ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
      LIMIT $${pi} OFFSET $${pi + 1}
    `;
    const rows = await query(sql, [...params, l, offset]);
    const cnt = await query(`SELECT COUNT(*) FROM blog_posts bp ${where}`, params);
    const total = parseInt(cnt.rows[0].count, 10) || 0;

    res.json({
      success: true,
      data: rows.rows,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 1
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Public detail by slug
router.get('/:slug', async (req, res) => {
  try {
    await ensureBlogTables();
    const result = await query(`
      SELECT
        bp.id,
        bp.title,
        bp.slug,
        bp.category,
        bp.excerpt,
        bp.content_html,
        bp.feature_image_url,
        bp.published_at,
        bp.created_at,
        bp.updated_at,
        u.name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON u.id = bp.created_by
      WHERE bp.slug = $1
        AND bp.status = 'published'
      LIMIT 1
    `, [req.params.slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
