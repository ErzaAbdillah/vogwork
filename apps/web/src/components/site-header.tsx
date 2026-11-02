import Link from "next/link";
import { LocaleToggle, ThemeToggle } from "./header-controls";
import { Logo } from "./logo";
import { T } from "./t";

const links = [
  { href: "/#alat", k: "navTools" },
  { href: "/pengaturan", k: "navData" },
  { href: "/tentang", k: "navAbout" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        <T k="skip" />
      </a>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-label="VogWork">
          <Logo />
        </Link>
        <nav className="ml-2 hidden items-center gap-1 text-sm sm:flex" aria-label="Utama">
          {links.map(({ href, k }) => (
            <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <T k={k} />
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1 text-sm sm:hidden" aria-label="Utama">
        {links.map(({ href, k }) => (
          <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <T k={k} />
          </Link>
        ))}
      </nav>
    </header>
  );
}
