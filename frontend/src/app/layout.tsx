import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces, Literata } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// UI chrome: labels, metadata, buttons. Kept as Geist — it is quiet, which is
// what chrome should be.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Display: Fraunces carries the masthead and headlines. Its optical-size axis
// keeps large titles tight and small ones readable, which is what gives the
// page a voice instead of the system serif it used to fall back to.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

// Reading: Literata was designed for long-form screen reading — sturdier and
// lower-contrast than the display face, so headings and body never look like
// the same font at two sizes.
const literata = Literata({
  subsets: ["latin"],
  variable: "--font-reading",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "AMR Blog — writing on building software",
  description:
    "Articles on backend, systems, and the craft of building software. Read, discuss, and publish.",
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
};

// Set the theme class before paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('amr_theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${literata.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <a href="#main" className="skip-link">Skip to content</a>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main id="main" className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
