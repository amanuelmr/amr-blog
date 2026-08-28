// Transactional email templates.
//
// These mirror the frontend's editorial identity rather than approximating it:
// warm paper ground, ink text, a single oxblood accent, hairline rules, a serif
// display face for headlines and monospace for codes and metadata. Token values
// are copied from frontend/src/app/globals.css — if the site palette changes,
// change it here too.
//
// Everything is table-based with inline styles because that is what survives
// Gmail and Outlook. Each template returns its own subject line so the wording
// lives next to the design instead of being spread across controllers.

// Escape user-controlled values before interpolating them into HTML emails
// to prevent HTML/markup injection (e.g. via a crafted display name).
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ---- Brand tokens — light ("paper and ink"), from globals.css :root ----
const C = {
  paper: "#f7f5f0", // --bg
  card: "#fcfaf6", // --card
  ink: "#1a1714", // --fg
  muted: "#6e675c", // --muted
  border: "#dcd5c8", // --border
  rule: "#c9c0ae", // --rule — the editorial hairline
  accent: "#a32e2a", // --accent (oxblood)
  accentFg: "#ffffff", // --accent-fg
  accentSoft: "#f1e3df", // --accent-soft
};

// ---- Brand tokens — dark, from globals.css .dark ----
const D = {
  paper: "#12100d",
  card: "#201c17",
  ink: "#efeae1",
  muted: "#a79e90",
  border: "#35302a",
  rule: "#443e36",
  accent: "#e08076",
  accentFg: "#1a1512",
  accentSoft: "#2e211e",
  accentSoftBorder: "#4a3330",
};

// Fraunces carries the masthead and headlines on the site. Clients that load
// web fonts (Apple Mail, iOS) get it; everywhere else falls back to a local
// editorial serif that keeps the same voice, so headlines never render as sans.
const DISPLAY = "'Fraunces','Iowan Old Style',Charter,Georgia,'Times New Roman',serif";
// Body copy and labels are sans on the site (Geist). A short transactional
// notice is UI chrome, not article prose, so it follows the chrome.
const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
// Codes, dates and metadata are monospace on the site.
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace";

const FRAUNCES_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap";

// Dark-mode overrides need !important because inline styles otherwise win.
// Only the handful of surfaces that carry colour are overridden.
const DARK_MODE_CSS = `
    @media (prefers-color-scheme: dark) {
      .e-paper { background:${D.paper} !important; }
      .e-card { background:${D.card} !important; border-color:${D.border} !important; }
      .e-ink { color:${D.ink} !important; }
      .e-muted { color:${D.muted} !important; }
      .e-rule { border-color:${D.rule} !important; }
      .e-accent { color:${D.accent} !important; }
      .e-otp { background:${D.accentSoft} !important; border-color:${D.accentSoftBorder} !important; }
      .e-code { color:${D.accent} !important; }
      .e-btn { background:${D.accent} !important; }
      .e-btn a { color:${D.accentFg} !important; }
    }`;

// Full email document: preheader, masthead, card, footer.
function wrap(preheader, bodyHtml) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>AMR Blog</title>
  <!--[if !mso]><!-->
  <link href="${FRAUNCES_HREF}" rel="stylesheet" />
  <!--<![endif]-->
  <style>${DARK_MODE_CSS}
  </style>
</head>
<body class="e-paper" style="margin:0;padding:0;background:${C.paper};">
  <span style="display:none;font-size:1px;color:${C.paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" class="e-paper" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};padding:40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
          <!-- Masthead: mirrors the site header wordmark. -->
          <tr>
            <td class="e-rule" style="padding:0 4px 14px;border-bottom:1px solid ${C.rule};">
              <span class="e-ink" style="font-family:${DISPLAY};font-size:19px;font-weight:600;letter-spacing:-0.02em;color:${C.ink};">AMR</span><span class="e-accent" style="font-family:${DISPLAY};font-size:19px;font-weight:600;color:${C.accent};">.</span><span class="e-muted" style="font-family:${SANS};font-size:13px;font-weight:400;color:${C.muted};">blog</span>
            </td>
          </tr>
          <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
          <tr>
            <td class="e-card" style="background:${C.card};border:1px solid ${C.border};border-radius:8px;padding:40px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="e-muted" style="padding:22px 4px 0;font-family:${SANS};font-size:12px;line-height:1.65;color:${C.muted};">
              © ${year} AMR Blog · Written for people who build.<br />
              You are receiving this because an action was requested for your account.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// The uppercase wide-tracked eyebrow used across the site for kickers.
const eyebrow = (text) =>
  `<p class="e-accent" style="margin:0 0 14px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};">${text}</p>`;

const heading = (text) =>
  `<h1 class="e-ink" style="margin:0 0 14px;font-family:${DISPLAY};font-size:27px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${C.ink};">${text}</h1>`;

const paragraph = (html) =>
  `<p class="e-ink" style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.ink};">${html}</p>`;

// The code itself is monospace and widely tracked, matching how the site sets
// metadata; the panel uses the soft accent tint rather than a heavy fill.
const otpBlock = (code, expiryText) => `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">
                <tr>
                  <td class="e-otp" align="center" style="background:${C.accentSoft};border:1px solid ${C.border};border-radius:8px;padding:24px;">
                    <div class="e-code" style="font-family:${MONO};font-size:31px;font-weight:600;letter-spacing:0.32em;text-indent:0.32em;color:${C.accent};">${code}</div>
                  </td>
                </tr>
              </table>
              <p class="e-muted" style="margin:0 0 18px;font-family:${MONO};font-size:12px;text-align:center;color:${C.muted};">${expiryText}</p>`;

const button = (href, label) => `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 2px;">
                <tr>
                  <td class="e-btn" align="center" bgcolor="${C.accent}" style="background:${C.accent};border-radius:6px;">
                    <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:${C.accentFg};text-decoration:none;">${label}</a>
                  </td>
                </tr>
              </table>`;

// Closing note, separated by the editorial hairline rather than a box.
const notice = (html) =>
  `<p class="e-muted e-rule" style="margin:22px 0 0;padding-top:16px;border-top:1px solid ${C.rule};font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">${html}</p>`;

const list = (items) =>
  `<ul class="e-ink" style="margin:0 0 20px;padding-left:20px;font-family:${SANS};font-size:15px;line-height:1.8;color:${C.ink};">${items
    .map((item) => `<li>${item}</li>`)
    .join("")}</ul>`;

// ---------------------------------------------------------------------------
// Templates. Each returns { subject, html, text }; `text` is the plaintext
// alternative, which is what spam filters expect on a multipart message and
// what clients with HTML disabled display.
// ---------------------------------------------------------------------------
function build(type, data, raw) {
  switch (type) {
    case "emailVerification":
      return {
        subject: "Verify your email",
        html: wrap(
          `Your AMR Blog verification code is ${data.otp}`,
          eyebrow("Account setup") +
            heading("Verify your email") +
            paragraph(
              `Hi <strong>${data.name}</strong>, welcome to AMR Blog. Enter this code to activate your account:`
            ) +
            otpBlock(data.otp, "Expires in 10 minutes") +
            notice("Didn’t create an account? You can safely ignore this email.")
        ),
        text: [
          "AMR Blog — Verify your email",
          "",
          `Hi ${raw.name}, welcome to AMR Blog.`,
          "Enter this code to activate your account:",
          "",
          `    ${raw.otp}`,
          "",
          "Expires in 10 minutes.",
          "",
          "Didn't create an account? You can safely ignore this email.",
        ].join("\n"),
      };

    case "passwordReset":
      return {
        subject: "Reset your password",
        html: wrap(
          "Your AMR Blog password reset code",
          eyebrow("Security") +
            heading("Reset your password") +
            paragraph(
              `Hi <strong>${data.name}</strong>, use the code below to set a new password:`
            ) +
            otpBlock(data.otp, "Expires in 15 minutes") +
            notice(
              `This request came from IP <strong>${data.ip || "Unknown"}</strong>. If it wasn’t you, ignore this email — your password won’t change.`
            )
        ),
        text: [
          "AMR Blog — Reset your password",
          "",
          `Hi ${raw.name}, use the code below to set a new password:`,
          "",
          `    ${raw.otp}`,
          "",
          "Expires in 15 minutes.",
          "",
          `This request came from IP ${raw.ip || "Unknown"}. If it wasn't you,`,
          "ignore this email — your password won't change.",
        ].join("\n"),
      };

    case "passwordChanged": {
      // Explicit UTC, formatted without a trailing abbreviation. toLocaleString()
      // rendered server-local time (meaningless to the reader) and ended in
      // "p.m.", which collided with the sentence's own full stop.
      const changedAt = `${new Date().toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        hour12: false,
      })} UTC`;
      return {
        subject: "Your password was changed",
        html: wrap(
          "Your AMR Blog password was changed",
          eyebrow("Security") +
            heading("Your password was changed") +
            paragraph(
              `Hi <strong>${data.name}</strong>, this confirms your AMR Blog password was successfully changed on <strong>${changedAt}</strong>.`
            ) +
            notice(
              "If you didn’t make this change, contact support immediately — your account may be at risk."
            )
        ),
        text: [
          "AMR Blog — Your password was changed",
          "",
          `Hi ${raw.name}, this confirms your AMR Blog password was`,
          `successfully changed on ${changedAt}.`,
          "",
          "If you didn't make this change, contact support immediately —",
          "your account may be at risk.",
        ].join("\n"),
      };
    }

    case "welcome":
    default: {
      const loginUrl = data.loginUrl || "http://localhost:3000/login";
      const loginUrlText = raw.loginUrl || "http://localhost:3000/login";
      return {
        subject: "Welcome to AMR Blog",
        html: wrap(
          "Your AMR Blog account is live",
          eyebrow("AMR · Journal") +
            heading("Your account is live") +
            paragraph(
              `Hi <strong>${data.name}</strong>, your email is verified. You can now:`
            ) +
            list([
              "Write and publish your own articles",
              "Comment on posts from other writers",
              "Like and save the writing you enjoy",
            ]) +
            button(loginUrl, "Start writing")
        ),
        text: [
          "AMR Blog — Your account is live",
          "",
          `Hi ${raw.name}, your email is verified. You can now:`,
          "",
          "  · Write and publish your own articles",
          "  · Comment on posts from other writers",
          "  · Like and save the writing you enjoy",
          "",
          `Start writing: ${loginUrlText}`,
        ].join("\n"),
      };
    }
  }
}

/**
 * Build a transactional email.
 *
 * @param {string} type one of emailVerification | passwordReset | passwordChanged | welcome
 * @param {object} rawData template fields; every value is HTML-escaped first
 * @returns {{subject: string, html: string, text: string}}
 */
const getEmailTemplate = (type, rawData) => {
  // Escape every incoming field so templates can interpolate safely.
  const data = Object.fromEntries(
    Object.entries(rawData || {}).map(([key, value]) => [key, escapeHtml(value)])
  );
  return build(type, data, rawData || {});
};

module.exports = { getEmailTemplate };
