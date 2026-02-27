const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true, methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads/selfies', express.static(path.join(__dirname, '../uploads/selfies'), { maxAge: '7d' }));

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.get('/', (req, res) => res.json({ name: 'Absenin API', version: '3.5.0', status: 'Running' }));
app.get('/health', (req, res) => res.json({ status: 'ok', version: '3.5.0', uptime: process.uptime() }));

// Log all API requests
app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path} | User: ${req.headers.authorization ? 'Auth' : 'NoAuth'}`);
  next();
});

const safe = (p) => { try { return require(p); } catch(e) { console.error(`❌ ${p}:`, e.message, e.stack); const r = require('express').Router(); r.use((req,res) => res.status(500).json({success:false,message:'Module error: '+e.message})); return r; }};

app.use('/api/auth', authLimiter, safe('./routes/auth'));
app.use('/api/employees', apiLimiter, safe('./routes/employees'));
app.use('/api/divisions', apiLimiter, safe('./routes/divisions'));
app.use('/api/positions', apiLimiter, safe('./routes/positions'));
app.use('/api/analytics', apiLimiter, safe('./routes/analytics'));
app.use('/api/reports', apiLimiter, safe('./routes/report'));
app.use('/api/overtime', apiLimiter, safe('./routes/overtime'));
app.use('/api/leaves', apiLimiter, safe('./routes/leaves'));
app.use('/api/selfie', apiLimiter, safe('./routes/selfie'));
app.use('/api/settings', apiLimiter, safe('./routes/settings'));
app.use('/api/payment', apiLimiter, safe('./routes/payment'));
app.use('/api/superadmin', apiLimiter, safe('./routes/superadmin'));
app.use('/api/webhook', safe('./routes/webhook'));

app.use((req, res) => { console.log(`[404] ${req.method} ${req.path}`); res.status(404).json({ success: false, message: `${req.method} ${req.path} not found` }); });
app.use((err, req, res, next) => { console.error('[ERR]', err); res.status(500).json({ success: false, message: 'Internal error' }); });

process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err); });
process.on('unhandledRejection', (err) => { console.error('REJECTION:', err); });

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🟢 ABSENIN API v3.5.0 | Port: ${PORT} | PID: ${process.pid}\n`);
});
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
module.exports = app;
