const { FilterXSS } = require("xss");

// Server-side allowlist sanitizer for rich blog content (Tiptap HTML output).
// This is the AUTHORITATIVE XSS gate — content is sanitized here before it is
// ever persisted, so a poisoned payload can never be stored or served.
// `xss` blocks javascript:/vbscript: URLs and event-handler attributes by
// default; we only need to declare the tags/attributes we permit.
const filter = new FilterXSS({
  whiteList: {
    h1: [], h2: [], h3: [], h4: [],
    p: [], br: [], hr: [],
    strong: [], b: [], em: [], i: [], u: [], s: [],
    blockquote: [],
    ul: [], ol: [], li: [],
    a: ["href", "target", "rel"],
    code: [], pre: [],
    img: ["src", "alt"],
    figure: [], figcaption: [],
  },
  stripIgnoreTag: true, // drop tags not on the allowlist
  stripIgnoreTagBody: ["script", "style", "textarea", "noscript", "iframe"],
});

function sanitizeContent(html) {
  if (typeof html !== "string") return "";
  return filter.process(html);
}

module.exports = sanitizeContent;
