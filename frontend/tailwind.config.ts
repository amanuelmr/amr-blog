import type { Config } from "tailwindcss";

const READING_STACK = 'var(--font-reading), "Iowan Old Style", Charter, Georgia, ui-serif, serif';

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        subtle: "rgb(var(--subtle) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        rule: "rgb(var(--rule) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
        "accent-fg": "rgb(var(--accent-fg) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        // The masthead and headlines.
        display: ["var(--font-display)", "Iowan Old Style", "Charter", "Georgia", "ui-serif", "serif"],
        // Long-form reading.
        serif: [READING_STACK],
      },
      fontSize: {
        // Editorial scale: metadata and labels are deliberately small and
        // wide-tracked; headlines get tight leading and negative tracking.
        label: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.14em" }],
        meta: ["0.8125rem", { lineHeight: "1.45" }],
      },
      maxWidth: {
        prose: "68ch",
        measure: "38rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0.7,0.3,1) both",
        "sheet-in": "sheet-in 0.18s cubic-bezier(0.2,0.7,0.3,1) both",
      },
      typography: {
        DEFAULT: {
          css: {
            fontFamily: READING_STACK,
            "--tw-prose-body": "rgb(var(--fg))",
            "--tw-prose-headings": "rgb(var(--fg))",
            "--tw-prose-links": "rgb(var(--accent))",
            "--tw-prose-quotes": "rgb(var(--fg))",
            "--tw-prose-quote-borders": "rgb(var(--accent))",
            "--tw-prose-captions": "rgb(var(--muted))",
            h2: { fontFamily: "var(--font-display), ui-serif, serif", letterSpacing: "-0.015em" },
            h3: { fontFamily: "var(--font-display), ui-serif, serif", letterSpacing: "-0.01em" },
            code: {
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              fontWeight: "500",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            pre: {
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            },
            blockquote: {
              fontStyle: "normal",
              borderLeftWidth: "2px",
              paddingLeft: "1.25em",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
