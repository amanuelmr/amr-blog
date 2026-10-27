const mongoose = require("mongoose");

// A passage of a post a reader highlighted. `text` is the passage itself
// (whitespace-normalized); the client finds it in the rendered post.
const highlightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true, index: true },
  text: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

highlightSchema.index({ user: 1, blog: 1, text: 1 }, { unique: true });

module.exports = mongoose.model("Highlight", highlightSchema);
