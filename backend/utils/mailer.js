// The single place that talks to an email provider.
//
// Controllers call sendEmail() and never see the transport, so swapping
// providers (or capturing mail in tests) is a one-file change. Resend is
// configured with RESEND_API_KEY and sends from MAIL_FROM, which must be an
// address on a domain verified in the Resend dashboard.
const { Resend } = require("resend");

// Fallback matches the verified sending domain so a missing MAIL_FROM degrades
// to something that actually delivers rather than a hard failure.
const DEFAULT_FROM = "AMR Blog <noreply@mail.amanuel.work>";

// Built on first send, not at import time: requiring this module must not throw
// in tests or at boot when the key is absent — only an actual send should.
let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set — cannot send email. Set it in the environment (see .env.example)."
      );
    }
    client = new Resend(apiKey);
  }
  return client;
}

/**
 * Send one transactional email.
 *
 * The Resend SDK reports failures as a populated `error` on a resolved promise
 * rather than by rejecting, which would let a failed send look successful to
 * callers. We surface it as a thrown Error so the existing try/catch around
 * every call site keeps working (e.g. register() still returns a 500 when the
 * verification email cannot be sent).
 *
 * @param {{to: string, subject: string, html: string, text?: string}} message
 * @returns {Promise<{id: string}>} the provider's message record
 */
async function sendEmail({ to, subject, html, text }) {
  const { data, error } = await getClient().emails.send({
    from: process.env.MAIL_FROM || DEFAULT_FROM,
    to,
    subject,
    html,
    // A plaintext alternative is what spam filters look for on a multipart
    // message, and it is what shows in clients with images/HTML disabled.
    ...(text ? { text } : {}),
  });

  if (error) {
    throw new Error(`Resend failed to send "${subject}": ${error.message || error.name}`);
  }
  return data;
}

/**
 * Whether email can be sent at all. Resend has no connection to "verify" the
 * way an SMTP transport does, so the meaningful check is configuration: a key
 * to authenticate with and a from-address on a verified domain. Deliberately
 * makes no API call — this runs from a health endpoint.
 *
 * @returns {{configured: boolean, from: string, hasApiKey: boolean}}
 */
function getMailerStatus() {
  const hasApiKey = Boolean(process.env.RESEND_API_KEY);
  return {
    configured: hasApiKey,
    hasApiKey,
    from: process.env.MAIL_FROM || DEFAULT_FROM,
  };
}

// Exported for tests that need to force a fresh client after changing env.
function __resetClient() {
  client = null;
}

module.exports = { sendEmail, getMailerStatus, __resetClient, DEFAULT_FROM };
