// Turn a title into a URL-safe slug: "The Quiet Architecture!" -> "the-quiet-architecture"
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // drop non-alphanumerics
    .replace(/\s+/g, "-") // spaces -> dashes
    .replace(/-+/g, "-") // collapse dashes
    .replace(/^-|-$/g, "") // trim leading/trailing dashes
    .slice(0, 80);
}

// A slug that is guaranteed unique by appending a short suffix from the id,
// e.g. "the-quiet-architecture-of-a-good-api-9f3a1c".
function makeSlug(title, id) {
  const base = slugify(title) || "post";
  return `${base}-${id.toString().slice(-6)}`;
}

module.exports = { slugify, makeSlug };
