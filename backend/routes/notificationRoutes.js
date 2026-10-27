/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: The current user's notifications (follows, likes, claps, comments, replies, new posts)
 */
const express = require("express");
const router = express.Router();
const { wrapAll } = require("../utils/asyncHandler");
const NotificationController = wrapAll(require("../controllers/notificationController"));
const authMiddleware = require("../middlewares/authMiddleware");

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: The current user's notifications, newest first (paginated, with unread count)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ notifications, total, unread, page, limit, totalPages }"
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, NotificationController.getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Number of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ unread: number }"
 */
router.get("/unread-count", authMiddleware, NotificationController.getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: Mark every notification read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ unread: 0 }"
 */
router.post("/read-all", authMiddleware, NotificationController.markAllRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark one notification read
 *     tags: [Notifications]
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
 *         description: "{ read: true }"
 *       404:
 *         description: Not found (or not yours)
 */
router.post("/:id/read", authMiddleware, NotificationController.markRead);

module.exports = router;
