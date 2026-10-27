const mongoose = require("mongoose");

// A named collection of posts a user keeps, beyond the default reading list
// (User.bookmarkedBlogs). Private by default; a public list shows on its
// owner's profile and can be opened by anyone with the link.
const readingListSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 280, default: "" },
    isPublic: { type: Boolean, default: false },
    items: [
      {
        _id: false,
        blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReadingList", readingListSchema);
