const mongoose = require("mongoose");

// Something that happened to a user's work or account, shown in their
// notifications. `actor` did it; `blog` (and `comment`) say where.
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["follow", "like", "clap", "comment", "reply", "new_post"],
    required: true,
  },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog" },
  comment: { type: mongoose.Schema.Types.ObjectId }, // a comment id within blog.comments
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
