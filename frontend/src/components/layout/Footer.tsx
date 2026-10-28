import Link from "next/link";
import { footerContent } from "@/constants/navigation";
import { Container } from "@/ui/Container";

export function Footer() {
  const { tagline, columns, socials, legal, copyright } = footerContent;

  return (
    <footer className="bg-primary text-primary-foreground">
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_3fr]">
        <p className="max-w-xs font-display text-3xl font-bold uppercase leading-none md:text-4xl">{tagline}</p>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wider">{column.title}</h2>
              <ul className="mt-3 space-y-2 text-sm font-medium">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      <Container className="flex justify-end pb-8">
        <ul className="flex flex-wrap gap-5 text-sm font-medium">
          {socials.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <div className="bg-background text-muted">
        <Container className="flex flex-col gap-3 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright}</p>
          <ul className="flex gap-5">
            {legal.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </footer>
  );
}
