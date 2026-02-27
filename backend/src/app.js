const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Fix: Trust proxy for nginx reverse proxy
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads/selfies', express.static(path.join(__dirname, '../uploads/selfies'), {
  maxAge: '7d',
  etag: true,
}));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.get('/', (req, res) => res.json({
  name: 'Absenin API', version: '3.1.0', status: 'Running',
  features: ['multi-tenant', 'saas', 'hrm', 'attendance', 'overtime', 'selfie', 'geolocation', 'payment'],
  timestamp: new Date().toISOString()
}));
app.get('/health', (req, res) => res.json({ status: 'ok', version: '3.1.0', uptime: process.uptime() }));

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
app.use('/api/webhook', require('./routes/webhook'));

app.use((req, res) => res.status(404).json({ success: false, message: `${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.type === 'entity.too.large' ? 413 : 500;
  res.status(status).json({ success: false, message: status === 413 ? 'File terlalu besar' : 'Internal server error' });
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`\n  🟢 ABSENIN API v3.1.0`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  PID: ${process.pid}\n`);
});

process.on('SIGTERM', () => { console.log('SIGTERM received'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('SIGINT received'); server.close(() => process.exit(0)); });

module.exports = app;
