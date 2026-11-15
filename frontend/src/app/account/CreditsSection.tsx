import type { Account, CreditGrant } from "@/lib/api/billingTypes";
import { SectionHeading } from "@/ui/SectionHeading";

const KIND_LABELS: Record<CreditGrant["kind"], string> = {
  plan: "Plan",
  carryover: "Carried over",
  addon: "Add-on",
  manual: "Bonus",
};

export function CreditsSection({ credits }: { credits: Account["credits"] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <SectionHeading title="Credits" tone="default" />
      <p className="mt-4 text-sm text-subtle">Available</p>
      <p className="text-4xl font-bold">{credits.available}</p>
      {credits.reserved > 0 && <p className="mt-2 text-sm text-muted">Reserved for running jobs: {credits.reserved}</p>}

      {credits.grants.length > 0 && (
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-subtle">
            <tr>
              <th className="py-2 pr-4 font-medium">Kind</th>
              <th className="py-2 pr-4 font-medium">Remaining</th>
              <th className="py-2 font-medium">Expires on</th>
            </tr>
          </thead>
          <tbody>
            {credits.grants.map((grant, index) => (
              <tr key={index} className="border-t border-border">
                <td className="py-2 pr-4">{KIND_LABELS[grant.kind] ?? grant.kind}</td>
                <td className="py-2 pr-4">{grant.remaining}</td>
                <td className="py-2">
                  {new Date(grant.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
