const Blog = require("../models/Blog");

// Posts written before publishedAt existed have none, which would sink them
// to the bottom of every newest-published-first list. Give each live one its
// creation date — the closest thing it has to a publish date. Idempotent:
// once filled, nothing matches again.
async function backfillPublishedAt() {
  await Blog.updateMany(
    { status: "published", publishedAt: null },
    [{ $set: { publishedAt: "$createdAt" } }]
  );
}

module.exports = backfillPublishedAt;
