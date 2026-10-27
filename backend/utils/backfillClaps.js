const Blog = require("../models/Blog");

// Likes from before claps existed count as one clap each. Only touches posts
// with likes but no claps yet, so it is idempotent and cheap after the first
// run.
async function backfillClaps() {
  await Blog.updateMany({ "likes.0": { $exists: true }, "claps.0": { $exists: false } }, [
    {
      $set: {
        claps: { $map: { input: "$likes", as: "u", in: { user: "$$u", count: 1 } } },
        clapCount: { $size: "$likes" },
      },
    },
  ]);
}

module.exports = backfillClaps;
