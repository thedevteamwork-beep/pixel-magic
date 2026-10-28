import { homeWidgets } from "@/constants/home";
import { Container } from "@/ui/Container";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";

export default function Home() {
  return (
    <Container as="main" className="flex flex-col gap-12 pt-4 pb-16 md:gap-16">
      <WidgetRenderer widgets={homeWidgets} />
    </Container>
  );
}
