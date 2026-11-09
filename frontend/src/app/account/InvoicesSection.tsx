import type { Invoice } from "@/lib/api/billingTypes";
import { formatMoney } from "@/lib/billing/money";
import { SectionHeading } from "@/ui/SectionHeading";

export function InvoicesSection({ invoices }: { invoices: Invoice[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <SectionHeading title="Payments" tone="default" />
      {invoices.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No payments yet.</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-subtle">
            <tr>
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Item</th>
              <th className="py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-border">
                <td className="py-2 pr-4">
                  {invoice.paidAt
                    ? new Date(invoice.paidAt).toLocaleDateString("en-US", { dateStyle: "medium" })
                    : "—"}
                </td>
                <td className="py-2 pr-4">{invoice.item ?? "Credits"}</td>
                <td className="py-2">
                  {invoice.amount === null ? "—" : formatMoney(invoice.amount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-4 text-xs text-subtle">Paddle emails a receipt for every payment.</p>
    </section>
  );
}
