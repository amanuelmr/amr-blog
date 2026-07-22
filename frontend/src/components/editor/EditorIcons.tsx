// Minimal inline SVG icon set for the editor menus (no icon dependency).
import { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const BoldIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />
  </svg>
);

export const ItalicIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

export const CodeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const LinkIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// Text-glyph icons for headings (clearer than a generic mark).
export const H2Icon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ ...p, strokeWidth: 0, fill: "currentColor" })}>
    <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="system-ui">H2</text>
  </svg>
);

export const H3Icon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ ...p, strokeWidth: 0, fill: "currentColor" })}>
    <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="system-ui">H3</text>
  </svg>
);

export const QuoteIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 21c3 0 5-2 5-5V5H3v7h3M13 21c3 0 5-2 5-5V5h-5v7h3" />
  </svg>
);

export const BulletListIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </svg>
);

export const OrderedListIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4M4 10h2" strokeWidth="1.5" />
    <path d="M4 15.5c0-.6.5-1 1-1s1 .4 1 1c0 .8-2 1.3-2 2.5h2" strokeWidth="1.5" />
  </svg>
);

export const ImageIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

export const DividerIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);
