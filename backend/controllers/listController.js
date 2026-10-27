const mongoose = require("mongoose");
const ReadingList = require("../models/ReadingList");
const Blog = require("../models/Blog");
const { publicFilter, PUBLIC_SORT } = require("../utils/blogVisibility");
const { PUBLIC_USER_FIELDS } = require("../utils/publicUser");

const MAX_LISTS = 50;
const MAX_ITEMS = 500;

const isOwner = (list, user) => !!user && list.owner.toString() === user.id.toString();

// A list as the client sees it: metadata and a count, not every item.
const summarize = (list, blogId) => ({
  _id: list._id,
  name: list.name,
  description: list.description,
  isPublic: list.isPublic,
  itemCount: list.items.length,
  updatedAt: list.updatedAt,
  ...(blogId ? { contains: list.items.some((i) => i.blog.toString() === blogId) } : {}),
});

async function findOwnList(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ msg: "List not found" });
    return null;
  }
  const list = await ReadingList.findById(req.params.id);
  if (!list || !isOwner(list, req.user)) {
    res.status(404).json({ msg: "List not found" });
    return null;
  }
  return list;
}

// The current user's lists, most recently changed first. ?blog=<id> adds
// whether each list already contains that post (for the Save menu).
exports.getMyLists = async (req, res) => {
  try {
    const lists = await ReadingList.find({ owner: req.user.id }).sort({ updatedAt: -1 });
    const blogId = mongoose.isValidObjectId(req.query.blog) ? req.query.blog : null;
    res.json({ lists: lists.map((l) => summarize(l, blogId)) });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.createList = async (req, res) => {
  try {
    const count = await ReadingList.countDocuments({ owner: req.user.id });
    if (count >= MAX_LISTS) {
      return res.status(400).json({ msg: `You can have at most ${MAX_LISTS} lists` });
    }
    const list = await ReadingList.create({
      owner: req.user.id,
      name: req.body.name,
      description: req.body.description || "",
      isPublic: !!req.body.isPublic,
    });
    res.status(201).json({ list: summarize(list) });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.updateList = async (req, res) => {
  try {
    const list = await findOwnList(req, res);
    if (!list) return;
    for (const field of ["name", "description", "isPublic"]) {
      if (req.body[field] !== undefined) list[field] = req.body[field];
    }
    await list.save();
    res.json({ list: summarize(list) });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.deleteList = async (req, res) => {
  try {
    const list = await findOwnList(req, res);
    if (!list) return;
    await list.deleteOne();
    res.json({ msg: "List deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Add a post to a list, or take it out if it's already there (toggle).
// Only live posts can be added; removing always works.
exports.toggleItem = async (req, res) => {
  try {
    const list = await findOwnList(req, res);
    if (!list) return;
    const { blogId } = req.body;
    const already = list.items.some((i) => i.blog.toString() === blogId);
    if (already) {
      list.items = list.items.filter((i) => i.blog.toString() !== blogId);
    } else {
      const blog = await Blog.findOne({ _id: blogId, ...publicFilter() }).select("_id");
      if (!blog) {
        return res.status(404).json({ msg: "Blog not found" });
      }
      if (list.items.length >= MAX_ITEMS) {
        return res.status(400).json({ msg: `A list can hold at most ${MAX_ITEMS} posts` });
      }
      list.items.push({ blog: blog._id });
    }
    await list.save();
    res.json({ saved: !already, itemCount: list.items.length });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// One list with its posts, most recently added first. Public lists are open
// to anyone; a private one 404s for everyone but its owner. Posts that have
// since gone private or been deleted are left out.
exports.getList = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ msg: "List not found" });
    }
    const list = await ReadingList.findById(req.params.id).populate("owner", PUBLIC_USER_FIELDS);
    if (!list || (!list.isPublic && !(req.user && list.owner._id.toString() === req.user.id.toString()))) {
      return res.status(404).json({ msg: "List not found" });
    }
    const order = new Map(list.items.map((i) => [i.blog.toString(), i.addedAt.getTime()]));
    const blogs = await Blog.find({ _id: { $in: [...order.keys()] }, ...publicFilter() })
      .populate("author", PUBLIC_USER_FIELDS)
      .sort(PUBLIC_SORT);
    blogs.sort((a, b) => order.get(b._id.toString()) - order.get(a._id.toString()));
    res.json({ list: { ...summarize(list), owner: list.owner }, blogs });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// A user's public lists, for their profile.
exports.getPublicListsOf = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.json({ lists: [] });
    }
    const lists = await ReadingList.find({ owner: req.params.userId, isPublic: true }).sort({ updatedAt: -1 });
    res.json({ lists: lists.map((l) => summarize(l)) });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};
