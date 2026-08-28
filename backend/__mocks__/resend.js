// Manual mock for the Resend SDK — auto-applied in tests (adjacent to
// node_modules). emails.send records the message so tests can read the
// plaintext OTP out of the email HTML rather than the hashed value stored in
// the database. Nothing leaves the process.
const __sentMail = [];

class Resend {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.emails = {
      // Mirrors the real SDK's shape: resolves with { data, error } instead of
      // rejecting, so utils/mailer.js error handling is exercised as written.
      send: (message) => {
        __sentMail.push(message);
        return Promise.resolve({
          data: { id: "test-message-id" },
          error: null,
        });
      },
    };
  }
}

module.exports = { Resend, __sentMail };
