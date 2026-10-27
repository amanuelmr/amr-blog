// Embeds: turning a pasted link into a provider's embed-player URL, and the
// allowlist that decides which iframes a post may contain. The backend
// enforces the same patterns in utils/embeds.js; keep the two in step.

const EMBED_SRC_PATTERNS = [
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{6,20}(\?start=\d+)?$/,
  /^https:\/\/player\.vimeo\.com\/video\/\d+$/,
  /^https:\/\/codepen\.io\/[\w-]+\/embed\/[\w-]+\?default-tab=result$/,
  /^https:\/\/codesandbox\.io\/embed\/[\w-]+$/,
];

export const EMBED_PROVIDERS = "YouTube, Vimeo, CodePen or CodeSandbox";

export function isAllowedEmbedSrc(src: string | null | undefined): boolean {
  return !!src && EMBED_SRC_PATTERNS.some((re) => re.test(src));
}

/**
 * The embed-player URL for a link to a video, pen or sandbox, with a title
 * for the iframe; null when the link isn't from a supported provider.
 */
export function toEmbed(link: string): { src: string; title: string } | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  let src: string | null = null;
  let title = "Embedded content";

  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? parts[0]
        : url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null);
    const start = Number.parseInt(url.searchParams.get("t") ?? url.searchParams.get("start") ?? "", 10);
    if (id) src = `https://www.youtube-nocookie.com/embed/${id}${start > 0 ? `?start=${start}` : ""}`;
    title = "YouTube video";
  } else if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.find((p) => /^\d+$/.test(p));
    if (id) src = `https://player.vimeo.com/video/${id}`;
    title = "Vimeo video";
  } else if (host === "codepen.io" && parts.length >= 3 && ["pen", "embed", "full", "details"].includes(parts[1])) {
    src = `https://codepen.io/${parts[0]}/embed/${parts[2]}?default-tab=result`;
    title = "CodePen";
  } else if (host === "codesandbox.io" && ["s", "p", "embed"].includes(parts[0]) && parts.length >= 2) {
    const id = parts[0] === "p" ? parts[2] : parts[1];
    if (id) src = `https://codesandbox.io/embed/${id}`;
    title = "CodeSandbox";
  }

  return isAllowedEmbedSrc(src) ? { src: src!, title } : null;
}
