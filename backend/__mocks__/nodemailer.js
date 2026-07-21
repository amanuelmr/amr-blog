// Manual mock for nodemailer — auto-applied in tests (adjacent to node_modules).
// sendMail records the message so tests can read the plaintext OTP from the
// email HTML rather than the hashed value stored in the database.
const __sentMail = [];

const createTransport = () => ({
  sendMail: (options) => {
    __sentMail.push(options);
    return Promise.resolve({ messageId: 'test-message-id' });
  },
  verify: () => Promise.resolve(true),
});

module.exports = { createTransport, __sentMail };
