import { Suspense } from "react";
import { GenerateForm } from "@/app/generate/GenerateForm";
import { Container } from "@/ui/Container";

export const metadata = { title: "Generate — Pixel Magic" };

export default function GeneratePage({ searchParams }: PageProps<"/generate">) {
  return (
    <Container className="py-10">
      <h1 className="mb-6 text-2xl font-semibold">Generate</h1>
      <Suspense>
        <GenerateFormFromQuery searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

// Reading the query is request-time data, so it sits inside <Suspense>.
async function GenerateFormFromQuery({ searchParams }: Pick<PageProps<"/generate">, "searchParams">) {
  const { job } = await searchParams;
  return <GenerateForm initialJobId={typeof job === "string" ? job : null} />;
}
