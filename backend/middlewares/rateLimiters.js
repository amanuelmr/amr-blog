const rateLimit = require("express-rate-limit");

const passThrough = (req, res, next) => next();

// Disable rate limiting under test so suites can hit endpoints repeatedly.
const isTest = process.env.NODE_ENV === "test";

// Applied app-wide as a coarse backstop against abuse.
const generalLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        msg: "Too many requests, please try again later.",
      },
    });

// Strict limiter for auth / OTP endpoints (brute-force & email-bombing vectors).
const authLimiter = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        msg: "Too many attempts. Please wait a few minutes and try again.",
      },
    });

module.exports = { generalLimiter, authLimiter };
