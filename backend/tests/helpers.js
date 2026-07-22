const nodemailer = require('nodemailer');

// Extract the plaintext 6-digit OTP from the most recently "sent" email.
// Markup-agnostic: matches the standalone 6-digit code wherever it appears.
const getLastOtp = () => {
  const last = nodemailer.__sentMail.at(-1);
  if (!last) return null;
  const match = last.html.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
};

const defaultUser = {
  name: 'Test User',
  email: 'test.user@example.com',
  password: 'password123',
};

// Register a user and verify their email. Returns the user payload used.
const registerAndVerify = async (agent, overrides = {}) => {
  const user = { ...defaultUser, ...overrides };

  await agent.post('/api/v1/auth/register').send(user).expect(201);
  const otp = getLastOtp();
  await agent
    .post('/api/v1/auth/verify-email')
    .send({ email: user.email, otp })
    .expect(200);

  return user;
};

// Register, verify, and log in. The supertest agent stores the auth cookies.
const registerVerifyLogin = async (agent, overrides = {}) => {
  const user = await registerAndVerify(agent, overrides);
  await agent
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  return user;
};

module.exports = { getLastOtp, registerAndVerify, registerVerifyLogin, defaultUser };
