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

  it("returns an empty string for non-string input", () => {
    expect(sanitizeContent(undefined)).toBe("");
    expect(sanitizeContent(null)).toBe("");
  });
});
