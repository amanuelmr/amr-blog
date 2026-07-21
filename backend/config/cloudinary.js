const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, _file) => {
    return {
      folder: 'blog-title-images',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      public_id: `blog-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
      transformation: [
        {
          width: 1200,
          height: 600,
          crop: 'fill',
          quality: 'auto:good'
        }
      ]
    };
  },
});

// Create multer upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

module.exports = { cloudinary, upload }; 