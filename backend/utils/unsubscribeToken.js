const jwt = require("jsonwebtoken");

// A long-lived, single-purpose token for the unsubscribe link in new-post
// emails, so a reader can unsubscribe without logging in. It names exactly
// one subscription (subscriber + writer) and can't be used as a login.
const PURPOSE = "unsubscribe";

function signUnsubscribeToken(subscriberId, authorId) {
  return jwt.sign(
    { sub: subscriberId.toString(), author: authorId.toString(), purpose: PURPOSE },
    process.env.ACCESS_TOKEN_SECRET,
    { algorithm: "HS256" }
  );
}

/** Returns { subscriber, author } or null when the token isn't valid. */
function verifyUnsubscribeToken(token) {
  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] });
    if (payload.purpose !== PURPOSE || !payload.sub || !payload.author) return null;
    return { subscriber: payload.sub, author: payload.author };
  } catch {
    return null;
  }
}

module.exports = { signUnsubscribeToken, verifyUnsubscribeToken };
