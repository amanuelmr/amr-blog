const mongoose = require("mongoose");

// Schema for individual comments
const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user who commented
  text: { type: String, required: true }, // The comment text
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date } // Set when a comment is edited; createdAt stays intact
});

const blogSchema = new mongoose.Schema({
  title: { type: String, required: [true, "Title is required"] },
  titleBackgroundImageUrl: { type: String }, // Optional field for title background image URL from file upload
  content: { type: String, required: [true, "Content is required"] }, // Simple string content
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array to store users who liked the post
  shares: { type: Number, default: 0 }, // Counter for shares
  comments: [commentSchema] // Array of comment sub-documents
});


module.exports = mongoose.model("Blog", blogSchema);
