const express = require('express');
const multer = require('multer');
const swaggerDocs = require('./swagger'); // Swagger docs
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Enable CORS
// app.use(cors()); 

// Initialize Swagger docs
swaggerDocs(app);

// Connect to the database
connectDB();

// Middleware for parsing JSON
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/blogs', require('./routes/blogRoutes'));
// app.use('/api/recommend', require('./routes/recommendRoutes'));

// Test Route
app.get('/test', (req, res) => {
    res.send('API working');
});

// Global error handling middleware - must be last
app.use((err, req, res, next) => {
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

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
