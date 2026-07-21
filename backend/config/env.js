require("dotenv").config();

// Environment variables the app cannot run without.
// Note: JWT_SECRET is intentionally omitted — auth uses ACCESS_TOKEN_SECRET /
// REFRESH_TOKEN_SECRET, and JWT_SECRET is not referenced anywhere.
const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "EMAIL",
  "PASSWORD",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

// Throws if any required variable is missing. Called once at startup so the
// process fails fast instead of erroring deep inside a request handler.
const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

module.exports = { validateEnv, REQUIRED_ENV_VARS };
