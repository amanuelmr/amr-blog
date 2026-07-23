const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Images are uploaded directly from the browser to Cloudinary (signed), so the
// server only needs the SDK configured for signing and admin calls — no multer
// / streaming through the serverless function (avoids Vercel's body limit).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = { cloudinary };
