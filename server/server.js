require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const executeRoutes = require('./routes/execute');
const aiRoutes = require('./routes/ai');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const cspReportUri = (process.env.CSP_REPORT_URI || '').trim();

function csvEnv(name) {
  return (process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildCspDirectives() {
  const clientOrigins = unique([
    process.env.CLIENT_URL,
    ...csvEnv('CORS_ORIGINS'),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  const directives = {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    scriptSrc: unique([
      "'self'",
      'https://www.gstatic.com',
      'https://www.googleapis.com',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com',
    ]),
    styleSrc: unique(["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']),
    imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com'],
    connectSrc: unique([
      "'self'",
      ...clientOrigins,
      'https://api.groq.com',
      'https://*.firebaseio.com',
      'https://*.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://firestore.googleapis.com',
      'https://wandbox.org',
    ]),
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
  };

  if (isProd) {
    directives.upgradeInsecureRequests = [];
  }

  if (cspReportUri) {
    directives.reportUri = [cspReportUri];
  }

  return directives;
}

// ──────────────────────────────────────────────
// Security Headers (all six required headers)
// ──────────────────────────────────────────────
app.use(helmet({
  // 1. Strict-Transport-Security — force HTTPS for 1 year (prod only)
  strictTransportSecurity: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,

  // 2. Content-Security-Policy — strict allowlist for the app's known providers
  contentSecurityPolicy: {
    directives: buildCspDirectives(),
  },

  // 3. X-Frame-Options — prevent clickjacking
  frameguard: { action: 'deny' },

  // 4. X-Content-Type-Options — prevent MIME sniffing
  noSniff: true,

  // 5. Referrer-Policy — no referrer leakage from API
  referrerPolicy: { policy: 'no-referrer' },

  // Other useful helmet defaults kept on
  xssFilter: true,
  hidePoweredBy: true,
  ieNoOpen: true,
}));

// 6. Permissions-Policy — helmet doesn't set this natively; add manually
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  next();
});

app.post(
  '/api/security/csp-report',
  express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'] }),
  (req, res) => {
    const report = req.body?.['csp-report'] || req.body;
    console.warn('[csp-report]', {
      blockedUri: report?.['blocked-uri'] || report?.blockedURL,
      violatedDirective: report?.['violated-directive'] || report?.effectiveDirective,
      documentUri: report?.['document-uri'] || report?.documentURL,
    });
    res.status(204).end();
  }
);

// ──────────────────────────────────────────────
// CORS
// ──────────────────────────────────────────────
app.use(cors());

// ──────────────────────────────────────────────
// Rate Limiting
// ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', globalLimiter);

// ──────────────────────────────────────────────
// Body Parsing & Compression
// ──────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/execute', executeRoutes);
app.use('/api/ai', aiRoutes);

// ──────────────────────────────────────────────
// Error Handler
// ──────────────────────────────────────────────
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Debugra server running on port ${PORT}`);
    console.log(`🔒 Security headers: HSTS=${isProd}, CSP=on, Permissions-Policy=on`);
  });
}

module.exports = { app, buildCspDirectives };
