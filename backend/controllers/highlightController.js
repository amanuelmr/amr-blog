const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const Highlight = require("../models/Highlight");
const { isPublished, isVisibleTo } = require("../utils/blogVisibility");

const MAX_PER_POST = 50;
// A passage becomes the post's "top highlight" once this many readers have
// highlighted it.
const TOP_MIN_READERS = 2;

const normalize = (s) => String(s || "").replace(/\s+/g, " ").trim();

// The post's text as a reader sees it, for checking that a highlighted
// passage is really in the post.
const plainText = (html) =>
  normalize(
    String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );

async function loadBlog(req, res, { mustBeLive }) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ msg: "Blog not found" });
    return null;
  }
  const blog = await Blog.findById(req.params.id).select("content status publishedAt author");
  if (!blog || (mustBeLive ? !isPublished(blog) : !isVisibleTo(blog, req.user))) {
    res.status(404).json({ msg: "Blog not found" });
    return null;
  }
  return blog;
}

// The requesting reader's highlights on a post, and its top highlight (the
// passage the most readers highlighted, once at least TOP_MIN_READERS have).
exports.getHighlights = async (req, res) => {
  try {
    const blog = await loadBlog(req, res, { mustBeLive: false });
    if (!blog) return;
    const [mine, top] = await Promise.all([
      req.user ? Highlight.find({ blog: blog._id, user: req.user.id }).select("text").sort({ createdAt: 1 }) : [],
      Highlight.aggregate([
        { $match: { blog: blog._id } },
        { $group: { _id: "$text", count: { $sum: 1 } } },
        { $match: { count: { $gte: TOP_MIN_READERS } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 1 },
      ]),
    ]);
    res.json({
      mine: mine.map((h) => ({ _id: h._id, text: h.text })),
      top: top[0] ? { text: top[0]._id, count: top[0].count } : null,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.addHighlight = async (req, res) => {
  try {
    const blog = await loadBlog(req, res, { mustBeLive: true });
    if (!blog) return;
    const text = normalize(req.body.text);
    if (!text || text.length > 500) {
      return res.status(400).json({ msg: "Highlight between 1 and 500 characters" });
    }
    if (!plainText(blog.content).includes(text)) {
      return res.status(400).json({ msg: "That passage isn't in this post" });
    }
    const count = await Highlight.countDocuments({ blog: blog._id, user: req.user.id });
    if (count >= MAX_PER_POST) {
      return res.status(400).json({ msg: `You can highlight at most ${MAX_PER_POST} passages per post` });
    }
    const highlight = await Highlight.findOneAndUpdate(
      { blog: blog._id, user: req.user.id, text },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    res.status(201).json({ highlight: { _id: highlight._id, text: highlight.text } });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.deleteHighlight = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.highlightId)) {
    return res.status(404).json({ msg: "Highlight not found" });
  }
  try {
    const result = await Highlight.deleteOne({ _id: req.params.highlightId, user: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: "Highlight not found" });
    }
    res.json({ msg: "Highlight removed" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};
