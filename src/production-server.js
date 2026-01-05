import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Production logging
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...(data && { data }) };
  console.log(JSON.stringify(logEntry));
};

log('info', 'Starting Unami Foundation Moments API', { 
  port: PORT, 
  env: process.env.NODE_ENV || 'production',
  railway: process.env.RAILWAY_ENVIRONMENT || 'unknown'
});

// Health check - FIRST, before any middleware
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Unami Foundation Moments API',
    version: '1.0.0',
    environment: process.env.RAILWAY_ENVIRONMENT || 'production',
    uptime: process.uptime()
  };
  
  log('info', 'Health check requested', health);
  res.status(200).json(health);
});

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Admin dashboard
app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'));
});

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/landing.html'));
});

// Basic webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    log('info', 'Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    log('warn', 'Webhook verification failed', { mode, token: token ? 'present' : 'missing' });
    res.status(403).json({ error: 'Forbidden' });
  }
});

// Webhook handler
app.post('/webhook', (req, res) => {
  log('info', 'Webhook received', { body: req.body });
  res.status(200).json({ status: 'received' });
});

// Admin endpoints - basic structure
app.get('/admin/analytics', (req, res) => {
  res.json({ 
    totalMoments: 0, 
    activeSubscribers: 0, 
    totalBroadcasts: 0,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((error, req, res, next) => {
  log('error', 'Server error', { error: error.message, stack: error.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  log('warn', '404 Not found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Not found' });
});

// Start server with comprehensive error handling
const startServer = () => {
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      log('info', 'Server started successfully', {
        port: PORT,
        host: '0.0.0.0',
        healthCheck: `http://0.0.0.0:${PORT}/health`,
        adminDashboard: `http://0.0.0.0:${PORT}/admin-dashboard.html`
      });
    });

    server.on('error', (error) => {
      log('error', 'Server error', { error: error.message });
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      log('info', `${signal} received, shutting down gracefully`);
      server.close(() => {
        log('info', 'Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (error) {
    log('error', 'Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;