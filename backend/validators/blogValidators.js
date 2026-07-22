const { z } = require("zod");

// Tags may arrive as an array (JSON) or a comma-separated string (form-data).
const tags = z.union([z.array(z.string()), z.string()]).optional();

// Content is rich HTML from the editor; cap size before it reaches the
// sanitizer/DB. min(1) rejects empty submissions (raw string).
const contentMax = 100000;

const createBlogSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  content: z.string().trim().min(1, "Content is required").max(contentMax, "Content is too long"),
  tags,
});

// All fields optional: an edit may update only the title background image
// (multipart file) without changing any text field.
const editBlogSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  content: z.string().trim().min(1).max(contentMax, "Content is too long").optional(),
  tags,
});

const commentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Comment text is required and must be non-empty.")
    .max(2000, "Comment is too long (max 2000 characters)."),
});

module.exports = { createBlogSchema, editBlogSchema, commentSchema };
