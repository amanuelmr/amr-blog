import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} AMR Blog. Written for people who build.</p>
        <nav className="flex items-center gap-5">
          <Link href="/" className="hover:text-fg">Home</Link>
          <Link href="/write" className="hover:text-fg">Write</Link>
          <a href="http://localhost:5000/swagger-ui" className="hover:text-fg" target="_blank" rel="noreferrer">API</a>
        </nav>
      </div>
    </footer>
  );
}
