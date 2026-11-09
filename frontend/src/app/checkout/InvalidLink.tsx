import { ButtonWithLink } from "@/ui/Button";

export function InvalidLink() {
  return (
    <div className="text-center">
      <p>This checkout link isn&apos;t valid.</p>
      <ButtonWithLink href="/pricing" className="mt-4">
        See plans
      </ButtonWithLink>
    </div>
  );
}
