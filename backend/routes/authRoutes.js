const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  register,
  login,
  verifyEmail,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  resendVerificationOTP,
  debugSystemHealth,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");



/**
* @swagger
* components:
*   schemas:
*     User:
*       type: object
*       required:
*         - name
*         - email
*         - password
*         - otp
*         - oldPassword
*         - newPassword
*       properties:
*         name:
*           type: string
*           description: The user's name
*         email:
*           type: string
*           description: The user's email
*         password:
*           type: string
*           description: The user's password
*         otp:
*           type: string
*           description: 6-digit OTP code for email verification and password reset
*         oldPassword:
*           type: string
*           description: The user's old password
*         newPassword:
*           type: string
*           description: The user's new password
*         refreshToken:
*           type: string
*           description: The user's token for refreshing the access token
*/

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: This endpoint registers a new user and sends a 6-digit verification code to their email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *                 description: Password must be at least 8 characters
 *     responses:
 *       201:
 *         description: User registered successfully, verification code sent to email
 *       400:
 *         description: User already exists or validation error
 *       500:
 *         description: Server error
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login a user
 *     description: This endpoint logs in a user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email with OTP
 *     description: This endpoint verifies a user's email address using a 6-digit OTP code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit verification code
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid OTP, expired code, or user already verified
 *       500:
 *         description: Server error
 */
router.post("/verify-email", verifyEmail);

/**
 * @swagger
 * /auth/resend-verification-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend email verification OTP
 *     description: This endpoint resends a new 6-digit verification code to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: New verification code sent to email
 *       400:
 *         description: User already verified
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/resend-verification-otp", resendVerificationOTP);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout a user
 *     description: This endpoint logs out a user.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       500:
 *         description: Server error
 */
router.post("/logout", authMiddleware, logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh JWT access token
 *     description: This endpoint refreshes the JWT access token.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: No token or invalid token
 *       500:
 *         description: Server error
 */
router.post("/refresh-token", refreshToken);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Send password reset OTP
 *     description: This endpoint sends a 6-digit OTP code to the user's email for password reset.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Password reset code sent to email
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with OTP
 *     description: This endpoint resets the user's password using a 6-digit OTP code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit password reset code
 *               password:
 *                 type: string
 *                 example: newpassword123
 *                 description: New password (minimum 8 characters)
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid OTP, expired code, or missing/invalid password
 *       500:
 *         description: Server error
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change password
 *     description: This endpoint changes the user's password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 *       500:
 *         description: Server error
 */
router.post("/change-password",authMiddleware, changePassword);

/**
 * @swagger
 * /auth/debug/health:
 *   get:
 *     tags: [Authentication]
 *     summary: System health check (Development only)
 *     description: Check system health including environment variables, database connection, and email service.
 *     responses:
 *       200:
 *         description: Health check completed
 *       500:
 *         description: Health check failed
 */
router.get("/debug/health", debugSystemHealth);

module.exports = router;
