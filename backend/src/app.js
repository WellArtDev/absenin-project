const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ⚡ FIX: Trust proxy for reverse proxy (nginx) - fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads/selfies', express.static(path.join(__dirname, '../uploads/selfies')));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.get('/', (req, res) => res.json({
  name: 'Absenin API', version: '3.0.0', status: 'Running',
  features: ['multi-tenant', 'attendance', 'overtime', 'selfie', 'geolocation-osm', 'hrm', 'payment'],
  timestamp: new Date().toISOString()
}));
app.get('/health', (req, res) => res.json({ status: 'ok', version: '3.0.0' }));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/employees', apiLimiter, require('./routes/employees'));
app.use('/api/divisions', apiLimiter, require('./routes/divisions'));
app.use('/api/positions', apiLimiter, require('./routes/positions'));
app.use('/api/analytics', apiLimiter, require('./routes/analytics'));
app.use('/api/reports', apiLimiter, require('./routes/report'));
app.use('/api/overtime', apiLimiter, require('./routes/overtime'));
app.use('/api/leaves', apiLimiter, require('./routes/leaves'));
app.use('/api/selfie', apiLimiter, require('./routes/selfie'));
app.use('/api/settings', apiLimiter, require('./routes/settings'));
app.use('/api/payment', apiLimiter, require('./routes/payment'));
app.use('/api/superadmin', apiLimiter, require('./routes/superadmin'));

// Webhooks - multiple providers
app.use('/api/webhook', require('./routes/webhook'));           // Generic/Multi-provider
app.use('/api/webhook/fonnte', require('./routes/webhookFonnte')); // Fonnte-specific

app.use((req, res) => res.status(404).json({ success: false, message: `${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(err.type === 'entity.too.large' ? 413 : 500).json({
    success: false,
    message: err.type === 'entity.too.large' ? 'File terlalu besar (maks 20MB)' : 'Internal server error'
  });
});

app.listen(PORT, () => console.log(`
  🟢 ABSENIN API
  Port: ${PORT}
  Env: ${process.env.NODE_ENV || 'development'}
  Features: Multi-Tenant, HRM, Overtime, Selfie, OSM GPS, Payment
  Trust Proxy: enabled
`));

module.exports = app;
