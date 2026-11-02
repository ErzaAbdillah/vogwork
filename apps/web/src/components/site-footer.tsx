import Link from "next/link";
import { manifests } from "@/lib/manifests";
import { Logo } from "./logo";
import { L, T } from "./t";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-card/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            <T k="footerTagline" />
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            <T k="footerPrivacy" />
          </p>
        </div>
        <nav aria-label="Alat" className="text-sm">
          <p className="mb-3 font-semibold">
            <T k="navTools" />
          </p>
          <ul className="space-y-2">
            {manifests.map((m) => (
              <li key={m.id}>
                <Link href={`/alat/${m.slug}`} className="text-muted-foreground hover:text-foreground">
                  <L text={m.name} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Lainnya" className="text-sm">
          <p className="mb-3 font-semibold">VogWork</p>
          <ul className="space-y-2">
            <li>
              <Link href="/tentang" className="text-muted-foreground hover:text-foreground">
                <T k="navAbout" />
              </Link>
            </li>
            <li>
              <Link href="/pengaturan" className="text-muted-foreground hover:text-foreground">
                <T k="navData" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">© 2026 VogWork</div>
    </footer>
  );
}
