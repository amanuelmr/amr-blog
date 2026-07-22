// Escape user-controlled values before interpolating them into HTML emails
// to prevent HTML/markup injection (e.g. via a crafted display name).
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ---- Brand tokens (kept in sync with the frontend teal/stone identity) ----
const C = {
  bg: "#f5f5f4", // stone-100
  card: "#ffffff",
  ink: "#1c1917", // stone-900
  muted: "#78716c", // stone-500
  border: "#e7e5e4", // stone-200
  accent: "#0d9488", // teal-600
  accentSoft: "#f0fdfa", // teal-50
  accentBorder: "#99f6e4", // teal-200
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Full email document: preheader + header wordmark + white card + footer.
// Table-based with inline styles for Gmail/Outlook robustness. Footer year is
// always the current year (no hardcoded value).
function wrap(preheader, bodyHtml) {
  const year = new Date().getFullYear();
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>AMR Blog</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bg};">
    <span style="display:none;font-size:1px;color:${C.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">
            <tr>
              <td style="padding:0 8px 20px;font-family:${FONT};font-size:20px;font-weight:700;color:${C.ink};letter-spacing:-0.02em;">
                AMR<span style="color:${C.accent};">.</span><span style="color:${C.muted};font-weight:400;">blog</span>
              </td>
            </tr>
            <tr>
              <td style="background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:40px;font-family:${FONT};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
                © ${year} AMR Blog · Written for people who build.<br />
                You’re receiving this because an action was requested for your account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

const heading = (text) =>
  `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:700;color:${C.ink};letter-spacing:-0.02em;">${text}</h1>`;

const paragraph = (html) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.ink};">${html}</p>`;

const otpBlock = (code, expiryText) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
    <tr>
      <td align="center" style="background:${C.accentSoft};border:1px solid ${C.accentBorder};border-radius:12px;padding:22px;">
        <div style="font-family:${FONT};font-size:34px;font-weight:700;letter-spacing:10px;color:${C.accent};">${code}</div>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 20px;font-size:13px;color:${C.muted};text-align:center;">${expiryText}</p>`;

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
    <tr>
      <td align="center" bgcolor="${C.accent}" style="border-radius:10px;">
        <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;

const notice = (html) =>
  `<p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${C.border};font-size:13px;line-height:1.6;color:${C.muted};">${html}</p>`;

function build(type, data) {
  switch (type) {
    case "emailVerification":
      return wrap(
        `Your AMR Blog verification code is ${data.otp}`,
        heading("Verify your email") +
          paragraph(`Hi <strong>${data.name}</strong>, welcome to AMR Blog. Enter this code to activate your account:`) +
          otpBlock(data.otp, "This code expires in 10 minutes.") +
          notice("Didn’t create an account? You can safely ignore this email.")
      );

    case "passwordReset":
      return wrap(
        "Your AMR Blog password reset code",
        heading("Reset your password") +
          paragraph(`Hi <strong>${data.name}</strong>, use the code below to set a new password:`) +
          otpBlock(data.otp, "This code expires in 15 minutes.") +
          notice(`This request came from IP <strong>${data.ip || "Unknown"}</strong>. If it wasn’t you, ignore this email — your password won’t change.`)
      );

    case "passwordChanged":
      return wrap(
        "Your AMR Blog password was changed",
        heading("Your password was changed") +
          paragraph(`Hi <strong>${data.name}</strong>, this confirms your AMR Blog password was successfully changed on <strong>${new Date().toLocaleString()}</strong>.`) +
          notice("If you didn’t make this change, contact support immediately — your account may be at risk.")
      );

    case "welcome":
    default:
      return wrap(
        "Welcome to AMR Blog",
        heading("Welcome to AMR Blog 🎉") +
          paragraph(`Hi <strong>${data.name}</strong>, your email is verified and your account is live. You can now:`) +
          `<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.8;color:${C.ink};">
             <li>Write and publish your own articles</li>
             <li>Comment on posts from other writers</li>
             <li>Like and save the writing you enjoy</li>
           </ul>` +
          button(data.loginUrl || "http://localhost:3000/login", "Start writing")
      );
  }
}

const getEmailTemplate = (type, rawData) => {
  // Escape every incoming field so templates can interpolate safely.
  const data = Object.fromEntries(
    Object.entries(rawData || {}).map(([key, value]) => [key, escapeHtml(value)])
  );
  return build(type, data);
};

module.exports = { getEmailTemplate };
