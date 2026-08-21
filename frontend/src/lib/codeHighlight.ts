import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import csharp from "highlight.js/lib/languages/csharp";
import cpp from "highlight.js/lib/languages/cpp";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  xml: "HTML",
  css: "CSS",
  json: "JSON",
  bash: "Shell",
  python: "Python",
  go: "Go",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
  sql: "SQL",
  yaml: "YAML",
  markdown: "Markdown",
  plaintext: "Text",
};

let registered = false;

function registerLanguages() {
  if (registered) return;
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("xml", xml); // covers html/jsx-ish markup
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("go", go);
  hljs.registerLanguage("java", java);
  hljs.registerLanguage("csharp", csharp);
  hljs.registerLanguage("cpp", cpp);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("yaml", yaml);
  hljs.registerLanguage("markdown", markdown);
  hljs.registerLanguage("plaintext", plaintext);
  registered = true;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Highlight every `<pre><code>` block inside `root` (auto-detecting the
 * language, since the editor doesn't tag code blocks with one) and attach a
 * copy button to each. Idempotent — safe to call again on re-render.
 */
export function enhanceCodeBlocks(root: HTMLElement): void {
  registerLanguages();

  const blocks = root.querySelectorAll<HTMLElement>("pre > code");
  blocks.forEach((codeEl) => {
    const pre = codeEl.parentElement as HTMLPreElement | null;
    if (!pre || pre.dataset.enhanced) return;
    pre.dataset.enhanced = "true";
    pre.classList.add("code-block");

    hljs.highlightElement(codeEl);

    // hljs writes the detected language onto the element as `language-x`;
    // surface it so a reader can tell TypeScript from Go at a glance.
    const detected = Array.from(codeEl.classList)
      .find((c) => c.startsWith("language-"))
      ?.replace("language-", "");

    const head = document.createElement("div");
    head.className = "code-head";

    const label = document.createElement("span");
    label.className = "code-lang";
    label.textContent = LANGUAGE_LABELS[detected ?? ""] ?? detected ?? "Code";
    head.appendChild(label);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-btn";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code");
    button.addEventListener("click", () => {
      void copyToClipboard(codeEl.textContent || "").then((ok) => {
        button.textContent = ok ? "Copied" : "Couldn\u2019t copy";
        window.setTimeout(() => {
          button.textContent = "Copy";
        }, 1500);
      });
    });
    head.appendChild(button);

    pre.insertBefore(head, codeEl);
  });
}
