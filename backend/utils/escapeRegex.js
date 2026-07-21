// Escape user input before using it inside a MongoDB $regex query so that
// regex metacharacters are treated literally (prevents regex injection / ReDoS).
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
