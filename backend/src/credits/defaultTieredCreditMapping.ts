import type { TieredCreditMapping } from "./tieredCredits.js";

// The mapping used when TIERED_CREDIT_MAPPING is not set.
// TODO(pricing): placeholder rates. fal prices (unverified, see the fal model
// pages): kling 2.1 Master about $1.40 for 5 s plus $0.28 per extra second;
// flux schnell about $0.003 per megapixel.
export const DEFAULT_TIERED_CREDIT_MAPPING: TieredCreditMapping = {
  kling21_generate: {
    tiers: [
      {
        name: "Basic",
        isDefault: true,
        meters: [{ metric: "duration", unitSize: 1, rate: 6, round: "ceil" }],
      },
    ],
  },
  fluxSchnell_generate: {
    tiers: [
      {
        name: "Basic",
        isDefault: true,
        meters: [{ metric: "images", unitSize: 1, rate: 1, round: "ceil" }],
      },
    ],
  },
};
