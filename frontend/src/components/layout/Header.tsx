import { headerContent, signedInLinks } from "@/constants/navigation";
import { HeaderAccount } from "@/components/layout/HeaderAccount";
import { Logo } from "@/components/layout/Logo";
import { Container } from "@/ui/Container";

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-(--header-height) border-b border-border bg-background/85 backdrop-blur">
      <Container className="flex h-full items-center gap-6">
        <Logo />
        <HeaderAccount links={headerContent.links} signedInLinks={signedInLinks} />
      </Container>
    </header>
  );
}
