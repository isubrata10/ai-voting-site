const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./src/middleware/errorHandler');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const voteRoutes = require('./src/routes/vote.routes');
const adminRoutes = require('./src/routes/admin.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Static files (for serving frontend if needed)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // also expose auth routes directly under /api for frontend compatibility
app.use('/api/vote', voteRoutes);
app.use('/api/vote', require('./src/routes/publicVote.routes'));
app.use('/api/candidates', require('./src/routes/candidates.routes'));
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SecureVote API',
    version: '1.0.0'
  });
});

// API Documentation route
app.get('/api-docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SecureVote API Documentation</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .endpoint { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 5px; }
          .method { padding: 5px 10px; border-radius: 3px; color: white; }
          .get { background: #61affe; }
          .post { background: #49cc90; }
          .put { background: #fca130; }
          .delete { background: #f93e3e; }
        </style>
      </head>
      <body>
        <h1>SecureVote API Documentation</h1>
        <div class="endpoint">
          <span class="method post">POST</span> /api/auth/register - Register new voter
        </div>
        <div class="endpoint">
          <span class="method post">POST</span> /api/auth/verify-otp - Verify OTP
        </div>
        <div class="endpoint">
          <span class="method post">POST</span> /api/auth/verify-face - Verify face
        </div>
        <div class="endpoint">
          <span class="method post">POST</span> /api/vote/cast - Cast vote
        </div>
        <div class="endpoint">
          <span class="method get">GET</span> /api/dashboard/stats - Get voting statistics
        </div>
      </body>
    </html>
  `);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;