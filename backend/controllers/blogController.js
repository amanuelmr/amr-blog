const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const Notification = require("../models/Notification");
const User = require("../models/User");
const escapeRegex = require("../utils/escapeRegex");
const notify = require("../utils/notify");
const getPagination = require("../utils/pagination");
const sanitizeContent = require("../utils/sanitizeContent");
const { makeSlug } = require("../utils/slugify");
const { cloudinary } = require("../config/cloudinary");
const { PUBLIC_USER_FIELDS } = require("../utils/publicUser");
const { publicFilter, isPublished, isOwner, isVisibleTo, PUBLIC_SORT } = require("../utils/blogVisibility");

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
      subtitle: req.body.subtitle || "",
      // Cover is uploaded directly to Cloudinary by the client; we store the URL.
      titleBackgroundImageUrl: req.body.titleBackgroundImageUrl || null,
      content: sanitizeContent(content), // rich HTML — sanitized before persisting
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      author: req.user.id,
      status,
      publishedAt,
      postType: req.body.postType === "field-note" ? "field-note" : "essay",
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
// excluded — this is the public feed. An optional ?author=<userId> narrows
// it to one author's posts, for their public profile page, and ?tag=<tag>
// to one topic (whole-tag, case-insensitive), for topic pages.
// ?sort=popular orders by views instead of recency.
exports.getAllBlogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { ...publicFilter() };
    if (req.query.author && mongoose.isValidObjectId(req.query.author)) {
      filter.author = req.query.author;
    }
    if (typeof req.query.tag === "string" && req.query.tag.trim()) {
      filter.tags = { $regex: `^${escapeRegex(req.query.tag.trim())}$`, $options: "i" };
    }
    const sort = req.query.sort === "popular" ? { views: -1, ...PUBLIC_SORT } : PUBLIC_SORT;
    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate("author", PUBLIC_USER_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit),
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

// The most-used tags across every live post, with how many posts carry
// each — most-used first, ties alphabetical.
exports.getTopics = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const topics = await Blog.aggregate([
      { $match: publicFilter() },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
      { $project: { _id: 0, tag: "$_id", count: 1 } },
    ]);
    res.json({ topics });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// How long an anonymous browser's view of a post counts as the same view.
const VIEW_WINDOW_MS = 12 * 60 * 60 * 1000;

// Get a blog by slug (preferred) or by Mongo id (backward compatible). A
// draft, or a scheduled post whose publish date hasn't arrived, 404s for
// anyone but its author — attach optionalAuth so req.user is available
// without forcing anonymous readers to authenticate.
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    let blog = await Blog.findOne({ slug: id }).populate("author", PUBLIC_USER_FIELDS);
    if (!blog && mongoose.isValidObjectId(id)) {
      blog = await Blog.findOne({ _id: id }).populate("author", PUBLIC_USER_FIELDS);
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

    // `bookmarked` reflects the requester's own saved posts (bookmarks live
    // on User, not Blog, so it can't be derived from the blog doc alone).
    const user = req.user ? await User.findById(req.user.id) : null;
    const bookmarked = !!user && user.bookmarkedBlogs.some((b) => b.toString() === blog._id.toString());
    const alreadyRead = !!user && user.readBlogs.some((b) => b.toString() === blog._id.toString());

    // Count a view once per reader: a signed-in reader the first time they
    // open the post, an anonymous one once per browser per VIEW_WINDOW_MS
    // (tracked with a cookie). The author's own visits never count, nor does
    // a load that opts out (?view=false — the edit page) or a draft/scheduled
    // preview. $inc stays atomic under concurrent requests; re-checking the
    // public condition in the query guards against the post's status
    // changing between the fetch above and this update.
    const seenCookie = `seen_${blog._id}`;
    const repeat = user ? alreadyRead : Boolean(req.cookies?.[seenCookie]);
    if (req.query.view !== "false" && isPublished(blog) && !isOwner(blog, req.user) && !repeat) {
      await Blog.updateOne({ _id: blog._id, ...publicFilter() }, { $inc: { views: 1 } });
      blog.views += 1;
      if (!user) {
        res.cookie(seenCookie, "1", {
          httpOnly: true,
          maxAge: VIEW_WINDOW_MS,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
      }
    }

    if (user && !alreadyRead) {
      user.readBlogs.push(blog._id);
      await user.save();
    }

    const payload = blog.toObject();
    payload.bookmarked = bookmarked;
    payload.myClaps = req.user
      ? blog.claps.find((c) => c.user.toString() === req.user.id.toString())?.count ?? 0
      : 0;
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
    if (req.body.subtitle !== undefined) blog.subtitle = req.body.subtitle; // "" clears it
    if (content) blog.content = sanitizeContent(content);
    if (tags) {
      blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    if (req.body.postType !== undefined) {
      blog.postType = req.body.postType === "field-note" ? "field-note" : "essay";
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

    if (["title", "subtitle", "content", "tags", "titleBackgroundImageUrl"].some((f) => blog.isModified(f))) {
      blog.editedAt = new Date();
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
      await Notification.deleteMany({ blog: blog._id });
  
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
    // Tags match whole-string (anchored) rather than as a substring: searching
    // a tag's name should return the posts carrying that exact tag — not
    // every post whose tags merely contain the word.
    const filter = {
      $and: [
        publicFilter(),
        {
          $or: [
            { title: { $regex: safeQuery, $options: "i" } },
            { subtitle: { $regex: safeQuery, $options: "i" } },
            { content: { $regex: safeQuery, $options: "i" } },
            { tags: { $regex: `^${safeQuery}$`, $options: "i" } },
          ],
        },
      ],
    };

    const { page, limit, skip } = getPagination(req.query);
    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate("author", PUBLIC_USER_FIELDS)
        .sort(PUBLIC_SORT)
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


    // Live posts on those topics that the user hasn't read or liked yet and
    // didn't write. Paginated like the other lists.
    const { page, limit, skip } = getPagination(req.query);
    const filter = {
      ...publicFilter(),
      tags: { $in: allTags },
      _id: { $nin: [...user.readBlogs, ...user.likedBlogs].map((b) => b._id) },
      author: { $ne: user._id },
    };
    const [blogs, total] = await Promise.all([
      Blog.find(filter).populate("author", PUBLIC_USER_FIELDS).sort(PUBLIC_SORT).skip(skip).limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.json({ blogs, total, page, limit, totalPages: Math.ceil(total / limit) });
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

    // Kept for API compatibility alongside claps: a like is one clap, and
    // unliking takes back all of this reader's claps.
    if (!user.likedBlogs.includes(req.params.id)) {
      user.likedBlogs.push(req.params.id);
      blog.likes.push(req.user.id);
      if (!blog.claps.some((c) => c.user.toString() === req.user.id)) {
        blog.claps.push({ user: req.user.id, count: 1 });
        blog.clapCount += 1;
      }
    } else {
      user.likedBlogs = user.likedBlogs.filter(
        (id) => id.toString() !== req.params.id
      );
      blog.likes = blog.likes.filter(
        (userId) => userId.toString() !== req.user.id
      );
      const entry = blog.claps.find((c) => c.user.toString() === req.user.id);
      if (entry) {
        blog.clapCount -= entry.count;
        blog.claps = blog.claps.filter((c) => c.user.toString() !== req.user.id);
      }
    }

    await user.save();
    await blog.save();

    if (blog.likes.some((u) => u.toString() === req.user.id)) {
      await notify({ recipient: blog.author, actor: req.user.id, type: "like", blog: blog._id });
    }

    res.json(blog);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Record that a reader shared a post (copied its link or sent it to a
// network). Anonymous readers can share too, so no auth is required; the
// counter is a rough signal, not an audit log.
exports.shareBlog = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ msg: "Blog not found" });
  }
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || !isPublished(blog)) {
      return res.status(404).json({ msg: "Blog not found" });
    }
    const updated = await Blog.findByIdAndUpdate(
      blog._id,
      { $inc: { shares: 1 } },
      { new: true, projection: { shares: 1 } }
    );
    res.json({ shares: updated.shares });
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
      Blog.find(filter).populate("author", PUBLIC_USER_FIELDS).sort(PUBLIC_SORT).skip(skip).limit(limit),
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
    let parentAuthor = null;
    if (parentComment) {
      const parent = blog.comments.id(parentComment);
      if (!parent) {
        return res.status(400).json({ msg: "Parent comment not found" });
      }
      // Replies are one level deep: a reply to a reply threads under the
      // original top-level comment instead of nesting further.
      resolvedParent = parent.parentComment || parent._id;
      parentAuthor = parent.user;
    }

    const newComment = {
      user: req.user.id,
      text: text.trim(),
      parentComment: resolvedParent,
    };

    blog.comments.unshift(newComment);
    await blog.save();

    // The person replied to hears about a reply; the post's author hears
    // about everything else (once — not twice when they wrote the parent).
    const commentId = blog.comments[0]._id;
    if (parentAuthor) {
      await notify({ recipient: parentAuthor, actor: req.user.id, type: "reply", blog: blog._id, comment: commentId });
    }
    if (!parentAuthor || parentAuthor.toString() !== blog.author.toString()) {
      await notify({ recipient: blog.author, actor: req.user.id, type: "comment", blog: blog._id, comment: commentId });
    }

    await blog.populate({ path: "comments.user", select: PUBLIC_USER_FIELDS });

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
      select: PUBLIC_USER_FIELDS,
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

    // The commenter can delete their own comment, and a post's author can
    // remove any comment on their post (moderation). Editing stays
    // commenter-only — an author shouldn't put words in a reader's mouth.
    if (comment.user.toString() !== req.user.id && !isOwner(blog, req.user)) {
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

    // Populate before responding so every comment endpoint returns the same
    // shape ({ user: { _id, name } }). Returning a bare author id here made
    // the client lose the commenter's name when it merged the response.
    await blog.populate({ path: "comments.user", select: PUBLIC_USER_FIELDS });

    res.json({
      msg: "Comment updated successfully",
      comment: blog.comments.id(req.params.commentId),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Issue a short-lived signature so the client can upload an image directly to
// Cloudinary (browser → Cloudinary), keeping large files off the serverless
// function. `type=content` targets a different folder than the cover.
exports.uploadSignature = async (req, res) => {
  const folders = { content: "blog-content-images", avatar: "user-avatars" };
  const folder = folders[req.query.type] || "blog-title-images";
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

// Follow or unfollow a topic (toggle). Topics are stored lowercase so
// "Go" and "go" are one topic.
exports.toggleTopicFollow = async (req, res) => {
  const tag = (req.params.tag || "").trim().toLowerCase();
  if (!tag || tag.length > 60) {
    return res.status(400).json({ msg: "Invalid topic" });
  }
  try {
    const already = (req.user.followedTopics || []).includes(tag);
    await User.updateOne(
      { _id: req.user.id },
      already ? { $pull: { followedTopics: tag } } : { $addToSet: { followedTopics: tag } }
    );
    res.json({ following: !already });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Live posts by the writers the user follows or on the topics they follow,
// newest-published first.
exports.getFollowingFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("following followedTopics");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const { page, limit, skip } = getPagination(req.query);
    const topics = (user.followedTopics || []).map((t) => new RegExp(`^${escapeRegex(t)}$`, "i"));
    const sources = [];
    if (user.following.length) sources.push({ author: { $in: user.following } });
    if (topics.length) sources.push({ tags: { $in: topics } });
    if (sources.length === 0) {
      return res.json({ blogs: [], total: 0, page, limit, totalPages: 0 });
    }

    // $and, not a spread: publicFilter() already has its own top-level $or.
    const filter = { $and: [publicFilter(), { $or: sources }, { author: { $ne: user._id } }] };
    const [blogs, total] = await Promise.all([
      Blog.find(filter).populate("author", PUBLIC_USER_FIELDS).sort(PUBLIC_SORT).skip(skip).limit(limit),
      Blog.countDocuments(filter),
    ]);
    res.json({ blogs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

const MAX_CLAPS = 50;

// Add claps (1–50 in one request, for a burst of clicks) from the current
// reader, capped at MAX_CLAPS per reader per post. Clapping also likes the
// post, which is what recommendations learn from.
exports.clapBlog = async (req, res) => {
  const add = Number(req.body.count ?? 1);
  if (!Number.isInteger(add) || add < 1 || add > MAX_CLAPS) {
    return res.status(400).json({ msg: `count must be a whole number from 1 to ${MAX_CLAPS}` });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ msg: "Blog not found" });
  }
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || !isPublished(blog)) {
      return res.status(404).json({ msg: "Blog not found" });
    }
    if (blog.author && blog.author.toString() === req.user.id) {
      return res.status(400).json({ msg: "You can't applaud your own post" });
    }

    const entry = blog.claps.find((c) => c.user.toString() === req.user.id);
    const before = entry ? entry.count : 0;
    const after = Math.min(MAX_CLAPS, before + add);
    if (entry) entry.count = after;
    else blog.claps.push({ user: req.user.id, count: after });
    blog.clapCount += after - before;
    if (!blog.likes.some((u) => u.toString() === req.user.id)) blog.likes.push(req.user.id);
    await blog.save();
    await User.updateOne({ _id: req.user.id }, { $addToSet: { likedBlogs: blog._id } });

    if (after > before) {
      await notify({ recipient: blog.author, actor: req.user.id, type: "clap", blog: blog._id });
    }
    res.json({ clapCount: blog.clapCount, mine: after });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Take back all of the current reader's claps on a post (and the like).
exports.unclapBlog = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ msg: "Blog not found" });
  }
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }
    const entry = blog.claps.find((c) => c.user.toString() === req.user.id);
    if (entry) {
      blog.clapCount -= entry.count;
      blog.claps = blog.claps.filter((c) => c.user.toString() !== req.user.id);
      blog.likes = blog.likes.filter((u) => u.toString() !== req.user.id);
      await blog.save();
      await User.updateOne({ _id: req.user.id }, { $pull: { likedBlogs: blog._id } });
    }
    res.json({ clapCount: blog.clapCount, mine: 0 });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};
