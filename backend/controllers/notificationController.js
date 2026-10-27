const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const getPagination = require("../utils/pagination");
const { PUBLIC_USER_FIELDS } = require("../utils/publicUser");

// The current user's notifications, newest first, with the unread count.
// Deleting a post deletes its notifications, so a populated blog is normally
// present; the client still copes with blog: null.
exports.getNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { recipient: req.user.id };
    const [notifications, total, unread] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actor", PUBLIC_USER_FIELDS)
        .populate("blog", "title slug"),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, read: false }),
    ]);
    res.json({ notifications, total, unread, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Just the unread count — cheap enough for the header to poll.
exports.getUnreadCount = async (req, res) => {
  try {
    const unread = await Notification.countDocuments({ recipient: req.user.id, read: false });
    res.json({ unread });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
    res.json({ unread: 0 });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.markRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ msg: "Notification not found" });
  }
  try {
    const result = await Notification.updateOne(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { read: true } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: "Notification not found" });
    }
    res.json({ read: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};
