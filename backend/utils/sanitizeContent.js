const { FilterXSS, safeAttrValue } = require("xss");
const { isAllowedEmbedSrc } = require("./embeds");

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
    // Embeds only — see utils/embeds.js. Disallowed iframes are removed
    // whole before filtering (below); this re-checks src as a backstop.
    iframe: ["src", "title", "allowfullscreen"],
  },
  safeAttrValue(tag, name, value, cssFilter) {
    if (tag === "iframe" && name === "src") return isAllowedEmbedSrc(value) ? value : "";
    return safeAttrValue(tag, name, value, cssFilter);
  },
  stripIgnoreTag: true, // drop tags not on the allowlist
  stripIgnoreTagBody: ["script", "style", "textarea", "noscript"],
});

const IFRAME = /<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>|<iframe\b[^>]*\/?>/gi;
const SRC = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

// Remove every iframe whose src isn't an allowed embed, contents and all, so
// no empty or stray iframe is left behind.
function dropDisallowedIframes(html) {
  return html.replace(IFRAME, (tag) => {
    const m = tag.match(SRC);
    const src = m ? m[1] ?? m[2] ?? m[3] : null;
    return isAllowedEmbedSrc(src) ? tag : "";
  });
}

function sanitizeContent(html) {
  if (typeof html !== "string") return "";
  return filter.process(dropDisallowedIframes(html));
}

module.exports = sanitizeContent;
