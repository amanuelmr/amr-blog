const request = require('supertest');
const app = require('../index');
const { getLastOtp, registerAndVerify, defaultUser } = require('./helpers');

describe('Auth flows', () => {
  describe('register', () => {
    it('registers a user and sends a verification email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(defaultUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(defaultUser.email);
      // Sensitive fields must never be returned
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.verificationOTP).toBeUndefined();
      // A 6-digit OTP was emailed
      expect(getLastOtp()).toMatch(/^\d{6}$/);
    });

    it('rejects invalid input with 400 (validation middleware)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'ab', email: 'not-an-email', password: 'short' })
        .expect(400);
      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('rejects duplicate emails', async () => {
      await request(app).post('/api/v1/auth/register').send(defaultUser).expect(201);
      await request(app).post('/api/v1/auth/register').send(defaultUser).expect(400);
    });
  });

  describe('verify-email', () => {
    it('verifies with the correct OTP', async () => {
      await request(app).post('/api/v1/auth/register').send(defaultUser).expect(201);
      const otp = getLastOtp();
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ email: defaultUser.email, otp })
        .expect(200);
      expect(res.body.verified).toBe(true);
    });

    it('rejects a wrong OTP', async () => {
      await request(app).post('/api/v1/auth/register').send(defaultUser).expect(201);
      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ email: defaultUser.email, otp: '000000' })
        .expect(400);
    });
  });

  describe('login', () => {
    it('logs in a verified user and sets httpOnly cookies without leaking tokens', async () => {
      const agent = request.agent(app);
      await registerAndVerify(agent);

      const res = await agent
        .post('/api/v1/auth/login')
        .send({ email: defaultUser.email, password: defaultUser.password })
        .expect(200);

      // Tokens must NOT appear in the JSON body
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();

      // ...but must be delivered as httpOnly cookies
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toMatch(/accessToken=/);
      expect(cookies).toMatch(/refreshToken=/);
      expect(cookies).toMatch(/HttpOnly/i);
    });

    it('rejects an unverified user', async () => {
      await request(app).post('/api/v1/auth/register').send(defaultUser).expect(201);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: defaultUser.email, password: defaultUser.password })
        .expect(400);
      expect(res.body.needsVerification).toBe(true);
    });

    it('rejects a wrong password', async () => {
      const agent = request.agent(app);
      await registerAndVerify(agent);
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: defaultUser.email, password: 'wrongpassword' })
        .expect(400);
    });
  });

  // Regression guard for the critical password re-hash lockout bug:
  // every save that didn't modify the password used to re-hash the stored hash.
  describe('password lockout regression', () => {
    it('allows repeated login and refresh without corrupting the password', async () => {
      const agent = request.agent(app);
      await registerAndVerify(agent);

      // First login
      await agent
        .post('/api/v1/auth/login')
        .send({ email: defaultUser.email, password: defaultUser.password })
        .expect(200);

      // Refresh tokens (this saves the user without touching the password)
      await agent.post('/api/v1/auth/refresh-token').send({}).expect(200);

      // Logout (another save that clears refreshToken)
      await agent.post('/api/v1/auth/logout').send({}).expect(200);

      // Logging in AGAIN must still succeed — the stored hash was not corrupted
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: defaultUser.email, password: defaultUser.password })
        .expect(200);
    });
  });

  describe('forgot / reset password', () => {
    it('resets the password using the emailed OTP', async () => {
      const agent = request.agent(app);
      await registerAndVerify(agent);

      await agent
        .post('/api/v1/auth/forgot-password')
        .send({ email: defaultUser.email })
        .expect(200);
      const otp = getLastOtp();

      await agent
        .post('/api/v1/auth/reset-password')
        .send({ email: defaultUser.email, otp, password: 'newpassword123' })
        .expect(200);

      // Old password no longer works; new one does
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: defaultUser.email, password: defaultUser.password })
        .expect(400);
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: defaultUser.email, password: 'newpassword123' })
        .expect(200);
    });
  });
});
