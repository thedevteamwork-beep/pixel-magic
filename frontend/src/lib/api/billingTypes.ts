// Hand-written copies of the backend billing shapes. Dates arrive as ISO strings.

export type Plan = {
  name: string;
  display: string;
  description: string;
  interval: "monthly" | "yearly";
  amount: string;
  currency: string;
  credits: number;
  creditValidityDays: number | null;
  priority: number;
};

export type Addon = {
  name: string;
  display: string;
  description: string;
  amount: string;
  currency: string;
  credits: number;
  durationDays: number;
};

export type Subscription = {
  plan: string;
  display: string;
  interval: "monthly" | "yearly";
  status: string;
  currentPeriodEnd: string;
  nextPlan: string | null;
  paddleStatus: string | null;
};

export type CreditGrant = {
  kind: "plan" | "carryover" | "addon" | "manual";
  remaining: number;
  expiresAt: string;
};

/** The full GET /v1/me response. */
export type Account = {
  userId: string;
  email: string | null;
  credits: { available: number; reserved: number; grants: CreditGrant[] };
  subscription: Subscription;
};

export type Invoice = {
  id: string;
  transactionId: string | null;
  itemType: "plan" | "addon";
  item: string | null;
  amount: string | null;
  currency: string;
  status: string;
  paidAt: string | null;
};

export type CheckoutResult = {
  action: "checkout";
  transactionId: string;
  checkoutUrl: string | null;
};

export type PlanChangeResult =
  CheckoutResult | { action: "scheduled"; effectiveAt: string } | { action: "reverted" } | { action: "canceled" };

/** The preview endpoint answers 409 for "same", so that type never appears here. */
export type PlanChangePreview = {
  changeType: "new" | "upgrade" | "downgrade" | "cancel";
  action: "now" | "period_end";
  effectiveAt: string;
  description: string;
};
