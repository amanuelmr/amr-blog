import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Body copy, navigation, buttons, long-form reading — everything that is
// meant to be read quickly and quietly.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// The technical voice: the masthead, headlines, article numbers, dates,
// categories and other metadata. One mono face carries both the display type
// and the code blocks, instead of splitting display/body/code across three
// unrelated families.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
      <body className={`${inter.variable} ${plexMono.variable} font-sans antialiased`}>
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
