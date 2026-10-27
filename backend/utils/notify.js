const Notification = require("../models/Notification");

// Reactions that can repeat (re-following, liking again after an unlike,
// clapping in bursts) collapse into the reader's one unread notification
// instead of stacking a new row each time.
const COLLAPSING = new Set(["follow", "like", "clap"]);

/**
 * Record a notification. Never notifies someone about their own action, and
 * never throws: a failed notification must not fail the like, comment or
 * follow that caused it.
 */
async function notify({ recipient, actor, type, blog = null, comment = null }) {
  if (!recipient || !actor || recipient.toString() === actor.toString()) return;
  try {
    if (COLLAPSING.has(type)) {
      await Notification.findOneAndUpdate(
        { recipient, actor, type, blog, read: false },
        { $set: { createdAt: new Date() } },
        { upsert: true }
      );
    } else {
      await Notification.create({ recipient, actor, type, blog, comment });
    }
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
}

module.exports = notify;
