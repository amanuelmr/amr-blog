const Blog = require("../models/Blog");
const User = require("../models/User");

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
      titleBackgroundImageUrl: req.file ? req.file.path : null, // Only use uploaded image
      content,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      author: req.user.id,
    });


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


// Get all blogs
exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().populate("author", "name");
    res.json(blogs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get a blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("author", "name");

    if (!blog) {
      return res.status(404).json({ msg: "Blog not found" });
    }

    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user && !user.readBlogs.includes(req.params.id)) {
        user.readBlogs.push(req.params.id);
        await user.save();
      }
    }

    res.json(blog);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Blog not found" });
    }
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
    if (content) blog.content = content;
    if (tags) {
      blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    
    // Only update image if new file is uploaded, otherwise keep existing
    if (req.file) {
      blog.titleBackgroundImageUrl = req.file.path;
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
    // Search by title or content (simplified)
    const blogs = await Blog.find({
      $or: [
        { title: { $regex: query, $options: "i" } }, // 'i' makes it case-insensitive
        { content: { $regex: query, $options: "i" } },
      ],
    }).populate("author", "name");

    res.json({
      success: true,
      msg: `Found ${blogs.length} blog(s)`,
      blogs,
      total: blogs.length
    });
  } catch (err) {
    console.error("Search blogs error:", err.message);
    res.status(500).json({
      success: false,
      msg: "Server error while searching blogs"
    });
  }
};

// Recommend blogs
// exports.recommendBlogs = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);

//     if (!user) {
//       return res.status(404).json({ msg: "User not found" });
//     }

//     const likedBlogs = await Blog.find({ _id: { $in: user.likedBlogs } });
//     const readBlogs = await Blog.find({ _id: { $in: user.readBlogs } });

//     const likedTags = likedBlogs.flatMap((blog) => blog.tags);
//     const readTags = readBlogs.flatMap((blog) => blog.tags);

//     const allTags = [...new Set([...likedTags, ...readTags])];

//     const recommendedBlogs = await Blog.find({
//       tags: { $in: allTags },
//       _id: { $nin: [...user.readBlogs, ...user.likedBlogs] },
//     });

//     res.json(recommendedBlogs);
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send("Server error");
//   }
// };

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
    const recommendedBlogs = await Blog.find({
      tags: { $in: allTags },
      _id: { $nin: [...user.readBlogs, ...user.likedBlogs] }, // Exclude already read or liked blogs
    });

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

    res.json(blog.comments);
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
    comment.createdAt = Date.now();

    await blog.save();

    res.json({ msg: "Comment updated successfully", comment });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};
