const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/User");
const escapeRegex = require("../utils/escapeRegex");
const getPagination = require("../utils/pagination");
const sanitizeContent = require("../utils/sanitizeContent");
const { makeSlug } = require("../utils/slugify");
const { cloudinary } = require("../config/cloudinary");

// Create a blog
exports.createBlog = async (req, res) => {
  try {


    const { title, content, tags } = req.body;

    // Input validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        msg: "Title and content are required"
      });
    }

    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        msg: "User authentication required"
      });
    }

    const blog = new Blog({
      title,
      // Cover is uploaded directly to Cloudinary by the client; we store the URL.
      titleBackgroundImageUrl: req.body.titleBackgroundImageUrl || null,
      content: sanitizeContent(content), // rich HTML — sanitized before persisting
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      author: req.user.id,
    });

    // Stable, unique, human-readable URL slug derived from the title.
    blog.slug = makeSlug(title, blog._id);

    await blog.save();
    
    res.status(201).json({
      success: true,
      msg: "Blog created successfully",
      blog
    });
  } catch (err) {
    console.error("Create blog error:", err);
    
    // Handle specific MongoDB validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Validation error",
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      msg: "Server error while creating blog",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};


// Get all blogs (paginated)
exports.getAllBlogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [blogs, total] = await Promise.all([
      Blog.find()
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(),
    ]);

    res.json({
      blogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get a blog by slug (preferred) or by Mongo id (backward compatible).
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    let blog = await Blog.findOne({ slug: id }).populate("author", "name");
    if (!blog && mongoose.isValidObjectId(id)) {
      blog = await Blog.findById(id).populate("author", "name");
    }

    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    // Backfill a slug for posts created before slugs existed, so their links
    // become pretty from the first view onward.
    if (!blog.slug) {
      blog.slug = makeSlug(blog.title, blog._id);
      await blog.save();
    }

    if (req.user) {
      const user = await User.findById(req.user.id);
      const already = user?.readBlogs?.some((b) => b.toString() === blog._id.toString());
      if (user && !already) {
        user.readBlogs.push(blog._id);
        await user.save();
      }
    }

    res.json(blog);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
// Edit blog
exports.editBlog = async (req, res) => {
  const { title, content, tags } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ 
        success: false,
        msg: "Blog not found" 
      });
    }
    if (blog.author.toString() !== req.user.id) {
      return res.status(401).json({ 
        success: false,
        msg: "User not authorized to edit this blog" 
      });
    }
    
    // Update fields if provided
    if (title) blog.title = title;
    if (content) blog.content = sanitizeContent(content);
    if (tags) {
      blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    
    // Cover URL: update when provided (a string sets it, null/"" clears it).
    if (req.body.titleBackgroundImageUrl !== undefined) {
      blog.titleBackgroundImageUrl = req.body.titleBackgroundImageUrl || null;
    }

    // Keep the slug stable across edits (link permanence); backfill if missing.
    if (!blog.slug) {
      blog.slug = makeSlug(blog.title, blog._id);
    }

    await blog.save();

    return res.status(200).json({ 
      success: true,
      msg: "Blog updated successfully", 
      blog 
    });
  } catch (error) {
    console.error("Edit blog error:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Server error while updating blog"
    });
  }
};



// Delete a blog
exports.deleteBlog = async (req, res) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) return res.status(404).json({ msg: "Blog is not found!" });
  
      if (blog.author.toString() !== req.user.id) {
        return res.status(401).json({ msg: "User not authorized to delete this blog" });
      }
      await blog.deleteOne();
  
      return res.status(200).json({ msg: "Blog deleted successfully" });
    } catch (error) {
      console.error(error.message);
      return res.status(500).send("Server error");
    }
  };


// Search blogs
exports.searchBlogs = async (req, res) => {
  const { query } = req.query;

  // Ensure the query is a string
  if (!query || typeof query !== "string") {
    return res.status(400).json({ 
      success: false,
      msg: "Invalid search query" 
    });
  }

  try {
    // Escape the user input so regex metacharacters are treated literally
    // (prevents regex injection / ReDoS).
    const safeQuery = escapeRegex(query.trim());
    const filter = {
      $or: [
        { title: { $regex: safeQuery, $options: "i" } },
        { content: { $regex: safeQuery, $options: "i" } },
      ],
    };

    const { page, limit, skip } = getPagination(req.query);
    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      msg: `Found ${total} blog(s)`,
      blogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Search blogs error:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server error while searching blogs"
    });
  }
};

// Recommend blogs based on the tags of the user's liked and read blogs.
exports.recommendBlogs = async (req, res) => {
  try {
    // Find the user and populate their liked and read blogs
    const user = await User.findById(req.user.id)
      .populate("likedBlogs", "tags") // Populate the 'tags' field from liked blogs
      .populate("readBlogs", "tags"); // Populate the 'tags' field from read blogs

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get all tags from the liked and read blogs
    const likedTags = user.likedBlogs.flatMap((blog) => blog.tags);
    const readTags = user.readBlogs.flatMap((blog) => blog.tags);

    // Create a unique set of all tags
    const allTags = [...new Set([...likedTags, ...readTags])];


    // Find blogs that match the tags but are not already read or liked by the user
    const { limit, skip } = getPagination(req.query);
    const recommendedBlogs = await Blog.find({
      tags: { $in: allTags },
      _id: { $nin: [...user.readBlogs, ...user.likedBlogs] }, // Exclude already read or liked blogs
    })
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Send recommended blogs
    res.json(recommendedBlogs);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Like/Unlike a blog
exports.likeBlog = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!user.likedBlogs.includes(req.params.id)) {
      user.likedBlogs.push(req.params.id);
      blog.likes.push(req.user.id);
    } else {
      user.likedBlogs = user.likedBlogs.filter(
        (id) => id.toString() !== req.params.id
      );
      blog.likes = blog.likes.filter(
        (userId) => userId.toString() !== req.user.id
      );
    }

    await user.save();
    await blog.save();

    res.json(blog);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Add a comment to a blog
exports.addComment = async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res
      .status(400)
      .json({ msg: "Comment text is required and must be non-empty." });
  }

  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    const newComment = {
      user: req.user.id,
      text: text.trim(),
    };

    blog.comments.unshift(newComment);
    await blog.save();

    await blog.populate({ path: "comments.user", select: "name" });

    res
      .status(201)
      .json({ msg: "Comment added successfully", comment: blog.comments[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Get comments for a blog
exports.getComments = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate({
      path: "comments.user",
      select: "name",
    });

    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    // Comments are embedded, so paginate in memory.
    const { page, limit, skip } = getPagination(req.query);
    const total = blog.comments.length;
    const comments = blog.comments.slice(skip, skip + limit);

    res.json({
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    if (comment.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: "User not authorized to delete this comment" });
    }
    blog.comments.pull(comment._id);
    await blog.save();

    res.json({ msg: "Comment removed successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Edit a comment
exports.editComment = async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res
      .status(400)
      .json({ msg: "Comment text is required and must be non-empty." });
  }

  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    if (comment.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: "User not authorized to edit this comment" });
    }

    comment.text = text.trim();
    comment.editedAt = Date.now();

    await blog.save();

    res.json({ msg: "Comment updated successfully", comment });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Issue a short-lived signature so the client can upload an image directly to
// Cloudinary (browser → Cloudinary), keeping large files off the serverless
// function. `type=content` targets a different folder than the cover.
exports.uploadSignature = async (req, res) => {
  const folder = req.query.type === "content" ? "blog-content-images" : "blog-title-images";
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );
  return res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  });
};
