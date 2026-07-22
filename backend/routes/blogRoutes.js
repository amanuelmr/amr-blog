/**
 * @swagger
 * tags:
 *   name: Blogs
 *   description: API for managing blogs
 * components:
 *   schemas:
 *     Blog:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           description: Blog's title
 *         content:
 *           type: string
 *           description: Blog's content as plain text
 *         tags:
 *           type: array
 *           description: Optional tags related to the blog
 *           items:
 *             type: string
 *           example: ["JavaScript", "Async", "Programming"]
 *         titleBackgroundImageUrl:
 *           type: string
 *           description: URL of the uploaded background image for the title
 */

const express = require('express');
const router = express.Router();
const { wrapAll } = require('../utils/asyncHandler');
const BlogController = wrapAll(require('../controllers/blogController'));
const authMiddleware = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { createBlogSchema, editBlogSchema, commentSchema } = require('../validators/blogValidators');
const { upload, uploadContent, cloudinary } = require('../config/cloudinary');

/**
 * @swagger
 * /blogs/create:
 *   post:
 *     summary: Create a new blog
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the blog
 *                 example: "Understanding Async/Await in JavaScript"
 *               titleBackgroundImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional background image file for the blog title
 *               content:
 *                 type: string
 *                 description: Blog content as plain text
 *                 example: "This is a comprehensive guide to understanding async/await in JavaScript..."
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags for the blog
 *                 example: "JavaScript,Async,Programming"
 *             required:
 *               - title
 *               - content
 *     responses:
 *       201:
 *         description: Blog created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Test endpoint for Cloudinary configuration.
// Only registered outside production to avoid exposing service diagnostics.
if (process.env.NODE_ENV !== 'production') {
  router.get('/test-cloudinary', async (req, res) => {
    try {
      const result = await cloudinary.api.ping();
      res.json({
        success: true,
        msg: 'Cloudinary connection successful',
        result
      });
    } catch {
      res.status(500).json({
        success: false,
        msg: 'Cloudinary connection failed'
      });
    }
  });
}

router.post('/create', authMiddleware, upload.single('titleBackgroundImage'), validate(createBlogSchema), BlogController.createBlog);

/**
 * @swagger
 * /blogs/upload-image:
 *   post:
 *     summary: Upload an inline image for the rich-text editor
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded; returns its hosted URL
 *       400:
 *         description: No image uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/upload-image', authMiddleware, uploadContent.single('image'), BlogController.uploadImage);

/**
 * @swagger
 * /blogs/recommend:
 *   get:
 *     summary: Recommend blogs based on likes and reads
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended blogs
 *       401:
 *         description: Unauthorized
 */
router.get('/recommend', authMiddleware, BlogController.recommendBlogs);

/**
 * @swagger
 * /blogs/search:
 *   get:
 *     summary: Search blogs
 *     tags: [Blogs]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query string
 *         required: true
 *     responses:
 *       200:
 *         description: List of blogs matching the query
 *       400:
 *         description: Invalid search query
 */
router.get('/search', BlogController.searchBlogs);

/**
 * @swagger
 * /blogs:
 *   get:
 *     summary: Get all blogs
 *     tags: [Blogs]
 *     responses:
 *       200:
 *         description: List of all blogs
 */
router.get('/', BlogController.getAllBlogs);

/**
 * @swagger
 * /blogs/{id}:
 *   get:
 *     summary: Get a specific blog by ID
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *     responses:
 *       200:
 *         description: Blog data
 *       404:
 *         description: Blog not found
 */
router.get('/:id', BlogController.getBlogById);

/**
 * @swagger
 * /blogs/{id}:
 *   put:
 *     summary: Edit a specific blog by ID
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the blog
 *                 example: "Understanding Async/Await in JavaScript"
 *               titleBackgroundImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional background image file for the blog title
 *               content:
 *                 type: string
 *                 description: Blog content as plain text
 *                 example: "This is a comprehensive guide to understanding async/await in JavaScript..."
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags for the blog
 *                 example: "JavaScript,Async,Programming"
 *     responses:
 *       200:
 *         description: Blog updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Blog not found
 */
router.put('/:id', authMiddleware, upload.single('titleBackgroundImage'), validate(editBlogSchema), BlogController.editBlog);

/**
 * @swagger
 * /blogs/{id}:
 *   delete:
 *     summary: Delete a specific blog by ID
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *     responses:
 *       200:
 *         description: Blog deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Blog not found
 */
router.delete('/:id', authMiddleware, BlogController.deleteBlog);

/**
 * @swagger
 * /blogs/{id}/like:
 *   post:
 *     summary: Like a blog
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *     responses:
 *       200:
 *         description: Blog liked successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/like', authMiddleware, BlogController.likeBlog);

/**
 * @swagger
 * /blogs/{id}/comments:
 *   post:
 *     summary: Add a comment to a blog
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Great post!"
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/comments', authMiddleware, validate(commentSchema), BlogController.addComment);

/**
 * @swagger
 * /blogs/{id}/comments:
 *   get:
 *     summary: Get all comments for a specific blog
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/:id/comments', BlogController.getComments);

/**
 * @swagger
 * /blogs/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment on a blog
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.delete('/:id/comments/:commentId', authMiddleware, BlogController.deleteComment);

/**
 * @swagger
 * /blogs/{id}/comments/{commentId}:
 *   put:
 *     summary: Edit a comment on a blog
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Updated comment"
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.put('/:id/comments/:commentId', authMiddleware, validate(commentSchema), BlogController.editComment);

module.exports = router;
