// The only iframes a post may contain: embed players from a short list of
// providers, matched on the exact URL shape the editor produces. Anything
// else (another host, a lookalike domain, extra path segments, javascript:
// or data: URLs) is not an embed and is removed. The frontend keeps a copy
// of these patterns in src/lib/embeds.ts; keep them in step.
const EMBED_SRC_PATTERNS = [
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{6,20}(\?start=\d+)?$/,
  /^https:\/\/player\.vimeo\.com\/video\/\d+$/,
  /^https:\/\/codepen\.io\/[\w-]+\/embed\/[\w-]+\?default-tab=result$/,
  /^https:\/\/codesandbox\.io\/embed\/[\w-]+$/,
];

const isAllowedEmbedSrc = (src) => typeof src === "string" && EMBED_SRC_PATTERNS.some((re) => re.test(src));

module.exports = { isAllowedEmbedSrc };
