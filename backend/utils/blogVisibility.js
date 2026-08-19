// A post is live once it's published and its publish date has arrived — a
// future publishedAt is how a scheduled post stays hidden until then. A
// draft, or a not-yet-due scheduled post, is only visible to its author.

// Mongo filter fragment for "publicly live" — used by list/search/recommend.
// A fresh object per call: `publishedAt` is compared against the current
// instant, so this must never be memoized as a module-level constant.
function publicFilter() {
  return {
    status: "published",
    $or: [{ publishedAt: null }, { publishedAt: { $lte: new Date() } }],
  };
}

// Same rule as publicFilter(), evaluated in memory against an already-loaded
// document.
function isPublished(blog) {
  return blog.status === "published" && (!blog.publishedAt || blog.publishedAt.getTime() <= Date.now());
}

function isOwner(blog, user) {
  if (!user || !blog.author) return false;
  const authorId = blog.author._id ? blog.author._id.toString() : blog.author.toString();
  return authorId === user.id.toString();
}

function isVisibleTo(blog, user) {
  return isPublished(blog) || isOwner(blog, user);
}

module.exports = { publicFilter, isPublished, isOwner, isVisibleTo };
