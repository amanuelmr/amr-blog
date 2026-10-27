/**
 * @swagger
 * tags:
 *   name: Lists
 *   description: Named reading lists (private by default; public ones show on the owner's profile)
 */
const express = require("express");
const router = express.Router();
const { wrapAll } = require("../utils/asyncHandler");
const ListController = wrapAll(require("../controllers/listController"));
const authMiddleware = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/optionalAuth");
const validate = require("../middlewares/validate");
const { createListSchema, updateListSchema, listItemSchema } = require("../validators/listValidators");

/**
 * @swagger
 * /lists/mine:
 *   get:
 *     summary: The current user's lists (pass ?blog=<id> to learn which contain that post)
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: blog
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ lists: [{ _id, name, description, isPublic, itemCount, updatedAt, contains? }] }"
 */
router.get("/mine", authMiddleware, ListController.getMyLists);

/**
 * @swagger
 * /lists/user/{userId}:
 *   get:
 *     summary: A user's public lists
 *     tags: [Lists]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ lists: [...] }"
 */
router.get("/user/:userId", ListController.getPublicListsOf);

/**
 * @swagger
 * /lists:
 *   post:
 *     summary: Create a list
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 60
 *               description:
 *                 type: string
 *                 maxLength: 280
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: "{ list }"
 */
router.post("/", authMiddleware, validate(createListSchema), ListController.createList);

/**
 * @swagger
 * /lists/{id}:
 *   get:
 *     summary: A list and its live posts (public lists for anyone; private ones only for the owner)
 *     tags: [Lists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ list, blogs }"
 *       404:
 *         description: Not found (or private and not yours)
 *   put:
 *     summary: Rename a list, change its description, or make it public/private
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ list }"
 *   delete:
 *     summary: Delete a list
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.get("/:id", optionalAuth, ListController.getList);
router.put("/:id", authMiddleware, validate(updateListSchema), ListController.updateList);
router.delete("/:id", authMiddleware, ListController.deleteList);

/**
 * @swagger
 * /lists/{id}/items:
 *   post:
 *     summary: Add a live post to a list, or remove it if already there (toggle)
 *     tags: [Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blogId:
 *                 type: string
 *     responses:
 *       200:
 *         description: "{ saved: boolean, itemCount: number }"
 */
router.post("/:id/items", authMiddleware, validate(listItemSchema), ListController.toggleItem);

module.exports = router;
