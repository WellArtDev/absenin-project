const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class SelfieService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads/selfies');
    this.maxSize = parseInt(process.env.MAX_SELFIE_SIZE) || 5 * 1024 * 1024;
    if (!fs.existsSync(this.uploadDir)) fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  getMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: this.maxSize },
      fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
        else cb(new Error('Hanya file gambar (JPG, PNG, WebP).'), false);
      },
    });
  }

  async processSelfie(buffer, employeeName, type = 'checkin') {
    try {
      const filename = `${uuidv4()}_${type}_${Date.now()}.jpg`;
      const filepath = path.join(this.uploadDir, filename);
      const now = new Date();
      const dateStr = now.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      const safeText = (employeeName || 'Unknown').replace(/[&<>"']/g, '');
      const watermarkSvg = Buffer.from(`<svg width="800" height="100">
        <rect x="0" y="0" width="800" height="100" fill="rgba(0,0,0,0.6)" rx="0"/>
        <text x="20" y="35" font-family="Arial,sans-serif" font-size="22" fill="white" font-weight="bold">${safeText}</text>
        <text x="20" y="65" font-family="Arial,sans-serif" font-size="18" fill="#25D366">${type === 'checkin' ? 'CHECK-IN' : 'CHECK-OUT'} - ${dateStr}</text>
        <text x="20" y="88" font-family="Arial,sans-serif" font-size="14" fill="#ccc">Absenin - Verified Selfie</text>
      </svg>`);

      await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .composite([{ input: watermarkSvg, gravity: 'south' }])
        .jpeg({ quality: 80 })
        .toFile(filepath);

      const baseUrl = process.env.SELFIE_BASE_URL || 'http://localhost:3001/uploads/selfies';
      return { success: true, filename, url: `${baseUrl}/${filename}` };
    } catch (error) {
      console.error('❌ Selfie process error:', error);
      return { success: false, error: error.message };
    }
  }

  async processFromWhatsApp(imageData, employeeName, type = 'checkin') {
    try {
      let buffer;
      if (typeof imageData === 'string') {
        if (imageData.startsWith('http')) {
          const fetch = require('node-fetch');
          const r = await fetch(imageData, { timeout: 30000 });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          buffer = await r.buffer();
        } else if (imageData.startsWith('data:image')) {
          buffer = Buffer.from(imageData.split(',')[1], 'base64');
        } else {
          buffer = Buffer.from(imageData, 'base64');
        }
      } else if (Buffer.isBuffer(imageData)) {
        buffer = imageData;
      } else {
        return { success: false, error: 'Format gambar tidak valid' };
      }

      if (!buffer || buffer.length < 100) {
        return { success: false, error: 'File gambar terlalu kecil atau kosong' };
      }

      return await this.processSelfie(buffer, employeeName, type);
    } catch (error) {
      console.error('❌ WA selfie error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SelfieService();
