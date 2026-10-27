import DOMPurify from "isomorphic-dompurify";
import { isAllowedEmbedSrc } from "./embeds";

// Render-time sanitizer for post HTML. Content is already sanitized on the
// server before it's stored; this is defense-in-depth. It allows iframes only
// for embeds from the allowlist, and runs each one sandboxed and lazy-loaded.

let hooked = false;
function installHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "iframe" && !isAllowedEmbedSrc((node as Element).getAttribute("src"))) {
      node.parentNode?.removeChild(node);
    }
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName !== "IFRAME") return;
    const el = node as Element;
    el.setAttribute("loading", "lazy");
    el.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    el.setAttribute("allow", "fullscreen; picture-in-picture; encrypted-media");
    el.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-presentation");
  });
}

export function sanitizeArticleHtml(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen"],
  });
}
