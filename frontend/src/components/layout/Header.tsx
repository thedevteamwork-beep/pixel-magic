import Link from "next/link";
import { headerContent } from "@/constants/navigation";
import { Logo } from "@/components/layout/Logo";
import { ButtonWithLink } from "@/ui/Button";
import { Container } from "@/ui/Container";

export function Header() {
  const { links, cta } = headerContent;

  return (
    <header className="sticky top-0 z-40 h-(--header-height) border-b border-border bg-background/85 backdrop-blur">
      <Container className="flex h-full items-center gap-6">
        <Logo />
        <nav aria-label="Main">
          <ul className="flex items-center gap-5 text-sm">
            {links.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-subtle transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ButtonWithLink href={cta.href} variant={cta.variant ?? "primary"} size="sm" className="ml-auto">
          {cta.label}
        </ButtonWithLink>
      </Container>
    </header>
  );
}
