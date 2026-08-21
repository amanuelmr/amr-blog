import Link from "next/link";
import { API_ORIGIN } from "@/lib/api";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-rule">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-meta text-muted sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} AMR Blog. Written for people who build.</p>
        <nav className="flex items-center gap-5">
          <Link href="/" className="hover:text-fg">Writing</Link>
          <a href="/rss.xml" className="hover:text-fg" target="_blank" rel="noreferrer">RSS</a>
          <a href={`${API_ORIGIN}/swagger-ui`} className="hover:text-fg" target="_blank" rel="noreferrer">API</a>
        </nav>
      </div>
    </footer>
  );
}
