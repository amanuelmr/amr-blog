const mongoose = require("mongoose");

// Schema for individual comments
const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user who commented
  text: { type: String, required: true }, // The comment text
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date }, // Set when a comment is edited; createdAt stays intact
  // Set on a reply; always points at a top-level comment's _id within the
  // same blog.comments array. Replies are one level deep — see addComment.
  parentComment: { type: mongoose.Schema.Types.ObjectId, default: null },
});

const blogSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Title is required"] },
  // URL-friendly identifier (e.g. "the-quiet-architecture-9f3a1c"). Sparse so
  // pre-existing documents without a slug don't collide on the unique index.
  slug: { type: String, unique: true, sparse: true, index: true },
  titleBackgroundImageUrl: { type: String }, // Optional field for title background image URL from file upload
  content: { type: String, required: [true, "Content is required"] }, // Simple string content
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tags: [String],
  // Essay: long-form, polished. Field note: a short observation or lesson.
  // Purely editorial — doesn't affect visibility, routing, or moderation.
  postType: { type: String, enum: ["essay", "field-note"], default: "essay" },
  createdAt: { type: Date, default: Date.now },
  // "published" with a future publishedAt is how a scheduled post stays
  // hidden until then (see utils/blogVisibility.js) — no separate
  // "scheduled" status needed.
  status: { type: String, enum: ["draft", "published"], default: "published" },
  publishedAt: { type: Date },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array to store users who liked the post
  shares: { type: Number, default: 0 }, // Counter for shares
  views: { type: Number, default: 0 }, // Counter for reads, bumped on each fetch by id/slug
  comments: [commentSchema] // Array of comment sub-documents
});


module.exports = mongoose.model("Blog", blogSchema);
