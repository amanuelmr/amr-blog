require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const cookieParser = require('cookie-parser');

const swaggerDocs = require('./swagger'); // Swagger docs
const connectDB = require('./config/db');
const { validateEnv } = require('./config/env');
const { generalLimiter } = require('./middlewares/rateLimiters');

const app = express();

// Behind Vercel/other proxies: trust the first proxy so client IPs (rate
// limiting) and secure-cookie detection work correctly.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — allow-list from CORS_ORIGIN (comma-separated); reflect origin if unset.
// credentials:true because auth uses httpOnly cookies.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));

// Request logging (quiet under test)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body & cookie parsing
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Coarse app-wide rate-limit backstop
app.use(generalLimiter);

// Initialize Swagger docs
swaggerDocs(app);

// Ensure the database is connected before handling API requests. On serverless
// (e.g. Vercel) the app is imported without running startServer(), so we
// connect lazily here; connectDB() caches and reuses the connection.
const ensureDb = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
};

// Routes
app.use('/api/v1/auth', ensureDb, require('./routes/authRoutes'));
app.use('/api/v1/blogs', ensureDb, require('./routes/blogRoutes'));

// Test Route
app.get('/test', (req, res) => {
    res.send('API working');
});

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ success: false, msg: 'Route not found' });
});

// Global error handling middleware - must be last.
// The 4-arg signature (including _next) is what marks it as an error handler.
app.use((err, req, res, _next) => {
    console.error('Global error handler:', err);

    // Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                msg: 'File too large. Maximum size is 5MB'
            });
        }
        return res.status(400).json({
            success: false,
            msg: `File upload error: ${err.message}`
        });
    }

    // Cloudinary or other file upload errors
    if (err.message && err.message.includes('Cloudinary')) {
        return res.status(500).json({
            success: false,
            msg: 'Image upload service error. Please try again later.'
        });
    }

    // Custom error messages
    if (err.message === 'Only image files are allowed!') {
        return res.status(400).json({
            success: false,
            msg: 'Only image files are allowed (jpg, jpeg, png, gif, webp)'
        });
    }

    // Default error
    res.status(500).json({
        success: false,
        msg: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start the server only after a successful DB connection. Exit on failure so
// the process never serves traffic against a dead database.
const startServer = async () => {
    try {
        validateEnv();
        await connectDB();
    } catch (err) {
        console.error('Startup failed:', err.message);
        process.exit(1);
    }

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
        console.log(`${signal} received, shutting down gracefully...`);
        server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

// Only auto-start when run directly (tests import `app` without listening).
if (require.main === module) {
    startServer();
}

module.exports = app;
