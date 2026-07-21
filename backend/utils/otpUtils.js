const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Generate a cryptographically-secure 6-digit OTP.
// crypto.randomInt gives a uniform value in [0, 1000000) with no modulo bias.
const generateSecureOTP = () => {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
};

// OTPs are stored hashed at rest so a DB leak does not expose active codes.
const hashOTP = async (otp) => bcrypt.hash(otp, 10);

const verifyOTP = async (otp, hash) => {
  if (!hash) return false;
  return bcrypt.compare(otp, hash);
};

// Check if OTP is expired (default 10 minutes)
const isOTPExpired = (otpCreatedAt, expiryMinutes = 10) => {
  if (!otpCreatedAt) return true;
  const now = new Date();
  const otpTime = new Date(otpCreatedAt);
  const diffInMinutes = (now - otpTime) / (1000 * 60);
  return diffInMinutes > expiryMinutes;
};

// Validate OTP format (6 digits)
const isValidOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

module.exports = {
  generateSecureOTP,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  isValidOTPFormat
};
