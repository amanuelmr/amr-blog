// Escape user-controlled values before interpolating them into HTML emails
// to prevent HTML/markup injection (e.g. via a crafted display name).
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getEmailTemplate = (type, rawData) => {
  // Escape every incoming field so templates can interpolate safely.
  const data = Object.fromEntries(
    Object.entries(rawData || {}).map(([key, value]) => [key, escapeHtml(value)])
  );
  const baseStyle = `
    <style>
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f8f9fa;
        padding: 20px;
      }
      .email-card {
        background: white;
        border-radius: 12px;
        padding: 40px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      }
      .logo {
        text-align: center;
        margin-bottom: 30px;
      }
      .logo h1 {
        color: #2563eb;
        font-size: 28px;
        margin: 0;
        font-weight: 700;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .header h2 {
        color: #1f2937;
        font-size: 24px;
        margin: 0 0 10px 0;
      }
      .content {
        text-align: center;
        margin-bottom: 30px;
      }
      .otp-code {
        background: #f3f4f6;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        text-align: center;
      }
      .otp-code h3 {
        font-size: 32px;
        color: #2563eb;
        letter-spacing: 4px;
        margin: 0;
        font-weight: 700;
      }
      .button {
        display: inline-block;
        background: #2563eb;
        color: white;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        margin: 20px 0;
      }
      .button:hover {
        background: #1d4ed8;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 14px;
      }
      .warning {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        color: #92400e;
      }
    </style>
  `;

  const templates = {
    emailVerification: `
      ${baseStyle}
      <div class="email-container">
        <div class="email-card">
          <div class="logo">
            <h1>📝 AMR Blog</h1>
          </div>
          <div class="header">
            <h2>Verify Your Email</h2>
            <p>Welcome to AMR Blog! Please verify your email address to activate your account.</p>
          </div>
          <div class="content">
            <p>Hello <strong>${data.name}</strong>,</p>
            <p>Use the verification code below to complete your registration:</p>
            <div class="otp-code">
              <h3>${data.otp}</h3>
            </div>
            <div class="warning">
              <strong>⏰ This code will expire in 10 minutes</strong><br>
              Don't share this code with anyone for security reasons.
            </div>
          </div>
          <div class="footer">
            <p>If you didn't request this verification, please ignore this email.</p>
            <p>© 2024 AMR Blog. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,

    passwordReset: `
      ${baseStyle}
      <div class="email-container">
        <div class="email-card">
          <div class="logo">
            <h1>🔐 AMR Blog</h1>
          </div>
          <div class="header">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password.</p>
          </div>
          <div class="content">
            <p>Hello <strong>${data.name}</strong>,</p>
            <p>Use the code below to reset your password:</p>
            <div class="otp-code">
              <h3>${data.otp}</h3>
            </div>
            <div class="warning">
              <strong>⏰ This code will expire in 15 minutes</strong><br>
              If you didn't request a password reset, please ignore this email.
            </div>
          </div>
          <div class="footer">
            <p>For security, this request was made from IP: ${data.ip || 'Unknown'}</p>
            <p>© 2024 AMR Blog. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,

    passwordChanged: `
      ${baseStyle}
      <div class="email-container">
        <div class="email-card">
          <div class="logo">
            <h1>✅ AMR Blog</h1>
          </div>
          <div class="header">
            <h2>Password Changed Successfully</h2>
            <p>Your password has been updated.</p>
          </div>
          <div class="content">
            <p>Hello <strong>${data.name}</strong>,</p>
            <p>This is a confirmation that your password has been successfully changed.</p>
            <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0; color: #065f46;">
              <strong>🔒 Your account is now secured with your new password.</strong>
            </div>
            <p>If you didn't make this change, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>Time: ${new Date().toLocaleString()}</p>
            <p>© 2024 AMR Blog. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,

    welcome: `
      ${baseStyle}
      <div class="email-container">
        <div class="email-card">
          <div class="logo">
            <h1>🎉 AMR Blog</h1>
          </div>
          <div class="header">
            <h2>Welcome to AMR Blog!</h2>
            <p>Your account has been successfully verified.</p>
          </div>
          <div class="content">
            <p>Hello <strong>${data.name}</strong>,</p>
            <p>Congratulations! Your email has been verified and your account is now active.</p>
            <p>You can now:</p>
            <ul style="text-align: left; margin: 20px 0;">
              <li>✍️ Create and publish your own blog posts</li>
              <li>💬 Comment on posts from other writers</li>
              <li>❤️ Like and share content you enjoy</li>
              <li>🔖 Get personalized blog recommendations</li>
            </ul>
            <a href="${data.loginUrl || 'http://localhost:3000/login'}" class="button">Start Blogging</a>
          </div>
          <div class="footer">
            <p>Happy blogging!</p>
            <p>© 2024 AMR Blog. All rights reserved.</p>
          </div>
        </div>
      </div>
    `
  };

  return templates[type] || templates.welcome;
};

module.exports = { getEmailTemplate }; 