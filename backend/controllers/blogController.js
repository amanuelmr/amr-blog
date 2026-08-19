const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/User");
const escapeRegex = require("../utils/escapeRegex");
const getPagination = require("../utils/pagination");
const sanitizeContent = require("../utils/sanitizeContent");
const { makeSlug } = require("../utils/slugify");
const { cloudinary } = require("../config/cloudinary");
const { publicFilter, isPublished, isVisibleTo } = require("../utils/blogVisibility");

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

    // A future publishedAt schedules the post (see utils/blogVisibility.js);
    // omitting it on a published post publishes immediately. Drafts carry no
    // publishedAt regardless of what was sent.
    const status = req.body.status === "draft" ? "draft" : "published";
    const publishedAt = status === "draft" ? null : req.body.publishedAt || new Date();

    const blog = new Blog({
      title,
      // Cover is uploaded directly to Cloudinary by the client; we store the URL.
      titleBackgroundImageUrl: req.body.titleBackgroundImageUrl || null,
      content: sanitizeContent(content), // rich HTML — sanitized before persisting
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      author: req.user.id,
      status,
      publishedAt,
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


// Get all blogs (paginated). Drafts and not-yet-due scheduled posts are
// excluded — this is the public feed.
exports.getAllBlogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [blogs, total] = await Promise.all([
      Blog.find(publicFilter())
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Blog.countDocuments(publicFilter()),
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

// Get a blog by slug (preferred) or by Mongo id (backward compatible). A
// draft, or a scheduled post whose publish date hasn't arrived, 404s for
// anyone but its author — attach optionalAuth so req.user is available
// without forcing anonymous readers to authenticate.
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    let blog = await Blog.findOne({ slug: id }).populate("author", "name");
    if (!blog && mongoose.isValidObjectId(id)) {
      blog = await Blog.findOne({ _id: id }).populate("author", "name");
    }

    if (!blog || !isVisibleTo(blog, req.user)) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    // Backfill a slug for posts created before slugs existed, so their links
    // become pretty from the first view onward.
    if (!blog.slug) {
      blog.slug = makeSlug(blog.title, blog._id);
      await blog.save();
    }

    // Count a real read: publicly live (a draft/scheduled preview is only
    // reachable by its author anyway) and not explicitly opted out — the
    // edit page passes ?view=false since loading a draft isn't a read.
    // $inc stays atomic under concurrent requests; re-checking the public
    // condition in the query guards against the post's status changing
    // between the fetch above and this update.
    if (req.query.view !== "false" && isPublished(blog)) {
      await Blog.updateOne({ _id: blog._id, ...publicFilter() }, { $inc: { views: 1 } });
      blog.views += 1;
    }

    // `bookmarked` reflects the requester's own saved posts (bookmarks live
    // on User, not Blog, so it can't be derived from the blog doc alone).
    let bookmarked = false;
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        bookmarked = user.bookmarkedBlogs.some((b) => b.toString() === blog._id.toString());
        const alreadyRead = user.readBlogs.some((b) => b.toString() === blog._id.toString());
        if (!alreadyRead) {
          user.readBlogs.push(blog._id);
          await user.save();
        }
      }
    }

    const payload = blog.toObject();
    payload.bookmarked = bookmarked;
    res.json(payload);
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

    // Status/publishedAt: only touched when explicitly sent, so a plain
    // content edit never resets an already-live post's publish date.
    if (req.body.status !== undefined) {
      blog.status = req.body.status;
      if (req.body.status === "draft") {
        blog.publishedAt = null;
      } else if (req.body.publishedAt !== undefined) {
        blog.publishedAt = req.body.publishedAt; // explicit publish-now/reschedule
      } else if (!blog.publishedAt) {
        blog.publishedAt = new Date(); // first publish, no date given: now
      }
      // else: was already published/scheduled and no new date was given —
      // leave the existing publishedAt untouched.
    } else if (req.body.publishedAt !== undefined) {
      blog.publishedAt = req.body.publishedAt; // reschedule without changing status
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
    // $and, not a spread: publicFilter() already has its own top-level $or.
    const filter = {
      $and: [
        publicFilter(),
        {
          $or: [
            { title: { $regex: safeQuery, $options: "i" } },
            { content: { $regex: safeQuery, $options: "i" } },
          ],
        },
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
      ...publicFilter(),
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

    if (!blog || !isVisibleTo(blog, req.user)) {
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

// Save/unsave a blog to the current user's reading list. Bookmarks live on
// User, not Blog, so (unlike likeBlog) this doesn't touch the blog doc.
exports.toggleBookmark = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || !isVisibleTo(blog, req.user)) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const already = user.bookmarkedBlogs.some((id) => id.toString() === req.params.id);
    if (already) {
      user.bookmarkedBlogs = user.bookmarkedBlogs.filter((id) => id.toString() !== req.params.id);
    } else {
      user.bookmarkedBlogs.push(req.params.id);
    }
    await user.save();

    res.json({ bookmarked: !already });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// The current user's reading list, newest-post-first. A post that's since
// gone private again (or been deleted) is silently excluded, not surfaced.
exports.getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const { page, limit, skip } = getPagination(req.query);
    const filter = { _id: { $in: user.bookmarkedBlogs }, ...publicFilter() };
    const [blogs, total] = await Promise.all([
      Blog.find(filter).populate("author", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.json({ blogs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Add a comment to a blog
exports.addComment = async (req, res) => {
  const { text, parentComment } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res
      .status(400)
      .json({ msg: "Comment text is required and must be non-empty." });
  }

  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog || !isVisibleTo(blog, req.user)) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    let resolvedParent = null;
    if (parentComment) {
      const parent = blog.comments.id(parentComment);
      if (!parent) {
        return res.status(400).json({ msg: "Parent comment not found" });
      }
      // Replies are one level deep: a reply to a reply threads under the
      // original top-level comment instead of nesting further.
      resolvedParent = parent.parentComment || parent._id;
    }

    const newComment = {
      user: req.user.id,
      text: text.trim(),
      parentComment: resolvedParent,
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

    if (!blog || !isVisibleTo(blog, req.user)) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    // Comments are embedded, so paginate in memory. Threads paginate by
    // top-level comment; every reply for a page's threads comes along
    // unpaginated (there are usually few per thread).
    const { page, limit, skip } = getPagination(req.query);
    const topLevel = blog.comments.filter((c) => !c.parentComment);
    const total = topLevel.length;
    const pageTopLevel = topLevel.slice(skip, skip + limit);
    const pageIds = new Set(pageTopLevel.map((c) => c._id.toString()));
    const replies = blog.comments
      .filter((c) => c.parentComment && pageIds.has(c.parentComment.toString()))
      .sort((a, b) => a.createdAt - b.createdAt);

    res.json({
      comments: [...pageTopLevel, ...replies],
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

    // Deleting a top-level comment also removes its replies.
    blog.comments
      .filter((c) => c.parentComment && c.parentComment.toString() === comment._id.toString())
      .forEach((reply) => blog.comments.pull(reply._id));
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

// The current user's own posts of any status (draft/scheduled/published),
// newest first — how an author finds their drafts again.
exports.getMyBlogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { author: req.user.id };
    const [blogs, total] = await Promise.all([
      Blog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(filter),
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
