const { z } = require("zod");

const email = z.string().trim().toLowerCase().email("A valid email is required");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(255);
const otp = z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code");

const registerSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(255),
  email,
  password,
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

const verifyEmailSchema = z.object({ email, otp });

const resendVerificationSchema = z.object({ email });

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z.object({ email, otp, password });

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: password,
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
