export function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}
