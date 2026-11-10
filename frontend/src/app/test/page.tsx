import { TestImage } from "@/app/test/TestImage";
import { Container } from "@/ui/Container";

export const metadata = { title: "Test — Pixel Magic" };

export default function TestPage() {
  return (
    <Container className="py-10">
      <h1 className="mb-2 text-2xl font-semibold">Test: generate an image</h1>
      <p className="mb-6 text-sm text-subtle">
        A quick check of the whole flow: one button creates a job and the image shows here when it is done. It uses
        credits.
      </p>
      <TestImage />
    </Container>
  );
}
