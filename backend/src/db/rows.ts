export interface ProfileRow {
  id: string;
  email: string | null;
  paddle_customer_id: string | null;
  created_at: Date;
}

export interface PlanRow {
  id: string;
  name: string;
  display: string;
  description: string;
  priority: number;
  interval: "monthly" | "yearly";
  amount: string;
  currency: string;
  credit_validity_days: number | null;
  custom: boolean;
  archived: boolean;
  paddle_product_id: string | null;
  paddle_price_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface AddonRow {
  id: string;
  name: string;
  display: string;
  description: string;
  amount: string;
  currency: string;
  duration_days: number;
  custom: boolean;
  archived: boolean;
  paddle_product_id: string | null;
  paddle_price_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  next_plan_id: string;
  status: "active" | "renewed" | "upgraded" | "downgraded" | "canceled";
  active: boolean;
  started_at: Date;
  current_period_start: Date;
  current_period_end: Date;
  canceled_at: Date | null;
  previous_subscription_id: string | null;
  invoice_id: string | null;
  paddle_subscription_id: string | null;
  paddle_status: string | null;
  paddle_cancel_pending: boolean;
  last_event_occurred_at: Date | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceRow {
  id: string;
  user_id: string;
  paddle_transaction_id: string | null;
  item_type: "plan" | "addon";
  item_id: string | null;
  change_type: "new" | "upgrade" | "downgrade" | null;
  from_subscription_id: string | null;
  status: "draft" | "paid" | "canceled" | "past_due";
  origin: string | null;
  amount: string | null;
  currency: string;
  checkout_url: string | null;
  paddle_subscription_id: string | null;
  billing_period_start: Date | null;
  billing_period_end: Date | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerAddonRow {
  id: string;
  user_id: string;
  addon_id: string;
  invoice_id: string | null;
  bought_at: Date;
  expires_at: Date;
  created_at: Date;
}

export interface GrantRow {
  id: string;
  user_id: string;
  kind: "plan" | "carryover" | "addon" | "manual";
  subscription_id: string | null;
  customer_addon_id: string | null;
  total: number;
  used: number;
  reserved: number;
  starts_at: Date;
  expires_at: Date;
  converted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AllocationRow {
  id: string;
  job_id: string;
  grant_id: string;
  amount: number;
  status: "reserved" | "captured" | "released";
  created_at: Date;
  updated_at: Date;
}

export interface LedgerRow {
  id: string;
  user_id: string;
  grant_id: string | null;
  job_id: string | null;
  invoice_id: string | null;
  type: "grant" | "reserve" | "capture" | "release" | "convert" | "adjust";
  amount: number;
  note: string | null;
  created_at: Date;
}

export interface PaymentEventRow {
  id: string;
  paddle_event_id: string;
  event_type: string;
  occurred_at: Date;
  payload: unknown;
  processed_at: Date | null;
  created_at: Date;
}

export interface JobRow {
  id: string;
  user_id: string;
  model_key: string;
  input: unknown;
  upload_ids: string[];
  credit_cost: number;
  status: string;
  idempotency_key: string;
  request_hash: string;
  fal_request_id: string | null;
  lease_expires_at: Date | null;
  attempts: number;
  outputs: { bucket: string; path: string; mimeType: string }[] | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Date;
  submitted_at: Date | null;
  completed_at: Date | null;
  updated_at: Date;
}

export type PlanWithCredits = PlanRow & { credits: number };
export type AddonWithCredits = AddonRow & { credits: number };
export type ActiveSubscription = SubscriptionRow & { plan: PlanWithCredits };
