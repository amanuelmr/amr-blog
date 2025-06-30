const crypto = require('crypto');

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a more secure OTP using crypto
const generateSecureOTP = () => {
  const buffer = crypto.randomBytes(3);
  const otp = parseInt(buffer.toString('hex'), 16) % 1000000;
  return otp.toString().padStart(6, '0');
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
  generateOTP,
  generateSecureOTP,
  isOTPExpired,
  isValidOTPFormat
}; 