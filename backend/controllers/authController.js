const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const {
  generateAccessTokenAndRefreshToken,
} = require("../utils/generateAccessTokenAndRefreshToken");

const {
  generateSecureOTP,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  isValidOTPFormat
} = require("../utils/otpUtils");

const { getEmailTemplate } = require("../utils/emailTemplates");

const emailerTransporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD, 
  },
});

exports.register = async (req, res) => {
  // Input is validated by the `validate(registerSchema)` route middleware.
  const { name, email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        msg: "User already exists with this email address.",
      });
    }

    // Create a new user object
    const user = new User({
      name,
      email,
      password,
    });

    // Generate OTP for email verification (stored hashed, emailed in plaintext)
    const verificationOTP = generateSecureOTP();
    user.verificationOTP = await hashOTP(verificationOTP);
    user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Persist the user first so a failed email never leaves an OTP without an account
    await user.save();

    // Send verification email with the plaintext OTP
    try {
      const emailTemplate = getEmailTemplate('emailVerification', {
        name: user.name,
        otp: verificationOTP
      });

      const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: "Verify Your Email - AMR Blog",
        html: emailTemplate,
      };

      await emailerTransporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      return res.status(500).json({
        success: false,
        msg: "Account created, but the verification email could not be sent. Please request a new code.",
      });
    }

    // Get user data without sensitive information
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken -verificationOTP -verificationOTPExpiry -passwordResetOTP -passwordResetOTPExpiry"
    );
    
    if (!createdUser) {
      return res.status(500).json({ 
        success: false,
        msg: "User created but failed to retrieve user data" 
      });
    }

    return res.status(201).json({
      success: true,
      msg: "User registered successfully. Please check your email for the verification code.",
      user: createdUser,
    });

  } catch (error) {
    console.error("Registration error details:", {
      message: error.message,
      stack: error.stack,
      email: email
    });
    
    res.status(500).json({
      success: false,
      msg: "Internal server error during registration. Please try again.",
      ...(process.env.NODE_ENV === "development" && { 
        debug: error.message 
      })
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  // Input validation
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      msg: "Email and password are required" 
    });
  }

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        msg: "Invalid credentials" 
      });
    }

    // Check if the user is verified
    if (!user.verified) {
      return res.status(400).json({ 
        success: false,
        msg: "Please verify your email to log in",
        needsVerification: true 
      });
    }

    // Compare provided password with the one in the DB
    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        msg: "Invalid credentials" 
      });
    }

    // Create and sign JWT tokens
    let accessToken, refreshToken;
    try {
      const tokens = await generateAccessTokenAndRefreshToken(user._id);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    } catch (tokenError) {
      console.error("Token generation failed:", tokenError);
      return res.status(500).json({ 
        success: false,
        msg: "Failed to generate authentication tokens. Please try again." 
      });
    }

    // Get user data without sensitive information
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken -verificationOTP -verificationOTPExpiry -passwordResetOTP -passwordResetOTPExpiry"
    );

    if (!loggedInUser) {
      return res.status(500).json({ 
        success: false,
        msg: "Failed to retrieve user data" 
      });
    }

    // Cookie options
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    // Tokens are delivered ONLY as httpOnly cookies and deliberately not in the
    // JSON body, so they are never exposed to client-side JavaScript / XSS.
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        success: true,
        msg: "Logged in successfully",
        user: loggedInUser,
      });

  } catch (error) {
    console.error("Login error details:", {
      message: error.message,
      stack: error.stack,
      email: email // Log email for debugging (not password for security)
    });
    
    res.status(500).json({ 
      success: false,
      msg: "Internal server error during login. Please try again.",
      ...(process.env.NODE_ENV === "development" && { 
        debug: error.message 
      })
    });
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  // Input validation
  if (!email || !otp) {
    return res.status(400).json({ 
      success: false,
      msg: "Email and OTP are required" 
    });
  }

  if (!isValidOTPFormat(otp)) {
    return res.status(400).json({ 
      success: false,
      msg: "Invalid OTP format. Please enter a 6-digit code." 
    });
  }

  try {
    // Find the user with the email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        msg: "User not found" 
      });
    }

    // If the user is already verified
    if (user.verified) {
      return res.status(400).json({ 
        success: false,
        msg: "User already verified",
        alreadyVerified: true 
      });
    }

    // Check if OTP exists
    if (!user.verificationOTP) {
      return res.status(400).json({ 
        success: false,
        msg: "No verification code found. Please request a new one.",
        needsNewOTP: true 
      });
    }

    // Check if OTP matches (stored hashed)
    const otpMatches = await verifyOTP(otp, user.verificationOTP);
    if (!otpMatches) {
      return res.status(400).json({
        success: false,
        msg: "Invalid verification code"
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.verificationOTPExpiry, 10)) {
      return res.status(400).json({ 
        success: false,
        msg: "Verification code has expired. Please request a new one.",
        expired: true,
        needsNewOTP: true 
      });
    }

    // Mark the user as verified
    user.verified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpiry = undefined;

    // Save the updated user
    await user.save();

    // Send welcome email
    try {
      const welcomeTemplate = getEmailTemplate('welcome', {
        name: user.name,
        loginUrl: 'http://localhost:3000/login'
      });

      const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: "Welcome to AMR Blog! 🎉",
        html: welcomeTemplate,
      };

      // Send welcome email (don't wait for it to complete)
      emailerTransporter.sendMail(mailOptions).catch(console.error);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the verification if welcome email fails
    }

    // Send success response
    return res.status(200).json({ 
      success: true,
      msg: "Email verified successfully! Welcome to AMR Blog!",
      verified: true 
    });

  } catch (error) {
    console.error('Email verification error details:', {
      message: error.message,
      stack: error.stack,
      email: email
    });
    
    return res.status(500).json({ 
      success: false,
      msg: "Internal server error during verification. Please try again.",
      ...(process.env.NODE_ENV === "development" && { 
        debug: error.message 
      })
    });
  }
};

exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: { refreshToken: undefined },
      },
      { new: true }
    );
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    };
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({ user: {}, msg: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ msg: "Failed to log out. Please try again." });
  }
};

exports.refreshToken = async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(404).json({ msg: "No user found" });
    }
    if (user.refreshToken !== incomingRefreshToken) {
      return res.status(401).json({ msg: "Invalid token" });
    }

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    // Cookie-only: tokens are not returned in the JSON body.
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({ msg: "Token refreshed successfully" });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate OTP for password reset (stored hashed, emailed in plaintext)
    const passwordResetOTP = generateSecureOTP();
    user.passwordResetOTP = await hashOTP(passwordResetOTP);
    user.passwordResetOTPExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Persist the OTP before sending the email
    await user.save();

    // Get user's IP address for security
    const userIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Send password reset email with the plaintext OTP
    const emailTemplate = getEmailTemplate('passwordReset', {
      name: user.name,
      otp: passwordResetOTP,
      ip: userIp
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: "Reset Your Password - AMR Blog",
      html: emailTemplate,
    };

    await emailerTransporter.sendMail(mailOptions);

    return res.status(200).json({ msg: "Password reset code sent to your email" });

  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ msg: "Failed to process the request. Please try again." });
  }
}

exports.resetPassword = async (req, res) => {
  // Input is validated by the `validate(resetPasswordSchema)` route middleware.
  const { email, otp, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    // Check if OTP exists
    if (!user.passwordResetOTP) {
      return res.status(400).json({ msg: "No password reset code found. Please request a new one." });
    }

    // Check if OTP matches (stored hashed)
    const otpMatches = await verifyOTP(otp, user.passwordResetOTP);
    if (!otpMatches) {
      return res.status(400).json({ msg: "Invalid reset code" });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.passwordResetOTPExpiry, 15)) {
      return res.status(400).json({ msg: "Reset code has expired. Please request a new one." });
    }

    // Update password and clear OTP
    user.password = password;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpiry = undefined;
    await user.save();

    // Send password changed confirmation email
    const passwordChangedTemplate = getEmailTemplate('passwordChanged', {
      name: user.name
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: "Password Changed Successfully - AMR Blog",
      html: passwordChangedTemplate,
    };

    // Send confirmation email (don't wait for it to complete)
    emailerTransporter.sendMail(mailOptions).catch(console.error);

    return res.status(200).json({ msg: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ msg: "Failed to reset password. Please try again." });
  }
}

// Resend verification OTP
exports.resendVerificationOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (user.verified) {
      return res.status(400).json({ msg: 'User is already verified' });
    }

    // Generate new OTP (stored hashed, emailed in plaintext)
    const verificationOTP = generateSecureOTP();
    user.verificationOTP = await hashOTP(verificationOTP);
    user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Persist the OTP before sending the email
    await user.save();

    // Send verification email with the plaintext OTP
    const emailTemplate = getEmailTemplate('emailVerification', {
      name: user.name,
      otp: verificationOTP
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: user.email,
      subject: "Verify Your Email - AMR Blog",
      html: emailTemplate,
    };

    await emailerTransporter.sendMail(mailOptions);

    return res.status(200).json({ msg: 'New verification code sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ msg: "Failed to resend verification code. Please try again." });
  }
};

// Debug endpoint to check system health and environment variables
exports.debugSystemHealth = async (req, res) => {
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'not set',
      envVariables: {
        JWT_SECRET: !!process.env.JWT_SECRET,
        ACCESS_TOKEN_SECRET: !!process.env.ACCESS_TOKEN_SECRET,
        REFRESH_TOKEN_SECRET: !!process.env.REFRESH_TOKEN_SECRET,
        EMAIL: !!process.env.EMAIL,
        PASSWORD: !!process.env.PASSWORD,
        MONGODB_URI: !!process.env.MONGODB_URI,
      },
      database: 'checking...',
      emailService: 'checking...'
    };

    // Test database connection
    try {
      await User.findOne();
      healthCheck.database = 'connected';
    } catch (dbError) {
      healthCheck.database = `error: ${dbError.message}`;
    }

    // Test email configuration
    try {
      await emailerTransporter.verify();
      healthCheck.emailService = 'configured';
    } catch (emailError) {
      healthCheck.emailService = `error: ${emailError.message}`;
    }

    return res.status(200).json({
      success: true,
      msg: "System health check completed",
      health: healthCheck
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: "Health check failed",
      error: error.message
    });
  }
};

// change password controller
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if(!oldPassword || !newPassword){
    return res.status(400).json({
      success: false,
      msg: 'Old password and new password are required'
    })
  }
  try {
    const user = await User.findById(req.user._id);
    if(!user){
      return res.status(404).json({
        success: false,
        msg: 'User not found'
      })
    }
    const isMatch = await user.isPasswordCorrect(oldPassword);
    if(!isMatch){
      return res.status(400).json({
        success: false,
        msg: 'Invalid old password'
      })
    }
    user.password = newPassword;
    await user.save();

    // Send password changed confirmation email
    try {
      const passwordChangedTemplate = getEmailTemplate('passwordChanged', {
        name: user.name
      });

      const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: "Password Changed Successfully - AMR Blog",
        html: passwordChangedTemplate,
      };

      // Send confirmation email (don't wait for it to complete)
      emailerTransporter.sendMail(mailOptions).catch(console.error);
    } catch (emailError) {
      console.error("Failed to send password change confirmation:", emailError);
    }

    return res.status(200).json({
      success: true,
      msg: 'Password changed successfully'
    })
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to change password. Please try again."
    })
  }
}
