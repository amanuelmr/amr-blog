const Blog = require("../models/Blog");
const User = require("../models/User");
const notify = require("./notify");
const { sendEmail } = require("./mailer");
const { getEmailTemplate } = require("./emailTemplates");
const { signUnsubscribeToken } = require("./unsubscribeToken");

// Only posts that went live recently are announced. This keeps the archive
// that predates announcements from being sent out all at once, and bounds
// how stale an announcement can be.
const WINDOW_MS = 24 * 60 * 60 * 1000;
// Posts announced per call, so one request never fans out without limit.
const BATCH = 10;
// How often a busy feed may check for due posts (per server instance).
const THROTTLE_MS = 60 * 1000;

const frontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

function summaryOf(blog) {
  if (blog.subtitle) return blog.subtitle;
  const text = (blog.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 200 ? `${text.slice(0, 200).replace(/\s+\S*$/, "")}…` : text;
}

async function announce(blog) {
  const author = await User.findById(blog.author).select("name");
  if (!author) return;

  // In-app: everyone who follows the writer.
  const followers = await User.find({ following: author._id }).select("_id");
  for (const f of followers) {
    await notify({ recipient: f._id, actor: author._id, type: "new_post", blog: blog._id });
  }

  // Email: everyone subscribed to the writer. One failed address must not
  // stop the rest.
  const subscribers = await User.find({ emailSubscriptions: author._id, verified: true }).select("email");
  const postUrl = `${frontendUrl()}/blog/${blog.slug || blog._id}`;
  for (const s of subscribers) {
    try {
      const token = signUnsubscribeToken(s._id, author._id);
      await sendEmail({
        to: s.email,
        ...getEmailTemplate("newPost", {
          authorName: author.name,
          title: blog.title,
          summary: summaryOf(blog),
          postUrl,
          unsubscribeUrl: `${frontendUrl()}/unsubscribe?token=${encodeURIComponent(token)}`,
        }),
      });
    } catch (err) {
      console.error("New-post email failed:", err.message);
    }
  }
}

/**
 * Announce every post that has gone live (published now, or a scheduled
 * post whose time has come) and hasn't been announced yet. Each post is
 * claimed atomically before announcing, so concurrent callers never
 * announce it twice. Never throws.
 */
async function announceDuePosts() {
  try {
    const now = new Date();
    for (let i = 0; i < BATCH; i++) {
      const blog = await Blog.findOneAndUpdate(
        {
          status: "published",
          announcedAt: null,
          publishedAt: { $lte: now, $gte: new Date(now.getTime() - WINDOW_MS) },
        },
        { $set: { announcedAt: now } },
        { new: true, sort: { publishedAt: 1 } }
      );
      if (!blog) break;
      await announce(blog);
    }
  } catch (err) {
    console.error("Announcing posts failed:", err.message);
  }
}

// Scheduled posts go live without anyone acting, and there's no background
// worker, so read traffic checks for due posts — at most once per
// THROTTLE_MS per server instance.
let lastCheck = 0;
async function announceDuePostsThrottled() {
  if (Date.now() - lastCheck < THROTTLE_MS) return;
  lastCheck = Date.now();
  await announceDuePosts();
}

module.exports = { announceDuePosts, announceDuePostsThrottled };
