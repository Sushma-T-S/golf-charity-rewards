import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold text-slate-900">
          Golf Charity
        </Link>

        <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <Link href="/charities" className="hover:text-slate-900">
            Charities
          </Link>
          <Link href="/draws" className="hover:text-slate-900">
            Draws
          </Link>
          <Link href="/winners" className="hover:text-slate-900">
            Winners
          </Link>
          <Link href="/scores" className="hover:text-slate-900">
            Scores
          </Link>
          <Link href="/dashboard" className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-700">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
