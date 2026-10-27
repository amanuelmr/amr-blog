const sanitizeContent = require("../utils/sanitizeContent");

describe("sanitizeContent (stored-XSS gate)", () => {
  it("removes <script> tags and their contents", () => {
    const out = sanitizeContent('<p>hi</p><script>alert(1)</script>');
    expect(out).toContain("<p>hi</p>");
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("alert(1)");
  });

  it("neutralizes javascript: URLs on links", () => {
    const out = sanitizeContent('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it("strips inline event handlers", () => {
    const out = sanitizeContent('<p onclick="steal()">z</p>');
    expect(out).not.toMatch(/onclick/i);
  });

  it("keeps a captioned image (figure, img alt, figcaption) as the editor writes it", () => {
    const html =
      '<figure><img src="https://res.cloudinary.com/x.png" alt="A cat on a desk">' +
      "<figcaption>The office supervisor</figcaption></figure>";
    expect(sanitizeContent(html)).toBe(html);
  });

  it("keeps safe formatting, links (with rel/target) and https images", () => {
    const out = sanitizeContent(
      '<h2>Title</h2><strong>b</strong><em>i</em>' +
        '<a href="https://example.com" rel="noopener nofollow" target="_blank">ok</a>' +
        '<img src="https://res.cloudinary.com/x.png" alt="a">'
    );
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('rel="noopener nofollow"');
    expect(out).toContain('src="https://res.cloudinary.com/x.png"');
  });

  it("keeps an embed from an allowed provider", () => {
    const html =
      '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Video" allowfullscreen="true"></iframe>';
    expect(sanitizeContent(html)).toBe(html);
    for (const src of [
      "https://player.vimeo.com/video/76979871",
      "https://codepen.io/someone/embed/abcDEF?default-tab=result",
      "https://codesandbox.io/embed/new-sandbox-x1y2z",
    ]) {
      expect(sanitizeContent(`<iframe src="${src}"></iframe>`)).toContain(`src="${src}"`);
    }
  });

  it("removes every other iframe entirely", () => {
    for (const src of [
      "https://evil.example/embed/x",
      "https://www.youtube-nocookie.com.evil.example/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ/../../x",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
    ]) {
      const out = sanitizeContent(`<p>a</p><iframe src="${src}">fallback</iframe><p>b</p>`);
      expect(out).toBe("<p>a</p><p>b</p>");
    }
    expect(sanitizeContent("<iframe srcdoc='<script>alert(1)</script>'></iframe>")).toBe("");
  });

  it("drops event handlers and unknown attributes on an allowed embed", () => {
    const out = sanitizeContent(
      '<iframe src="https://player.vimeo.com/video/1" onload="steal()" srcdoc="x" style="x"></iframe>'
    );
    expect(out).toBe('<iframe src="https://player.vimeo.com/video/1"></iframe>');
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizeContent(undefined)).toBe("");
    expect(sanitizeContent(null)).toBe("");
  });
});
