import type { TieredCreditMapping } from "./tieredCredits.js";

// The mapping used when TIERED_CREDIT_MAPPING is not set. Every model needs an
// entry: startup prices every job a model can take and stops on a gap.
//
// Rates are Pixelbin's production TIERED_CREDIT_MAPPING for the same models
// (its keys are display names, e.g. "NanoBananaPro"; ours are model keys).
// Pixelbin also gives its default tier conditions; here the default is the
// unconditional fallback, so those were dropped (the other tiers cover the
// remaining values, which startup checks by pricing every job).
// fluxSchnell has no Pixelbin entry and keeps a flat 1 credit per image.
// Facts a tier tests come from each model's `billing` in its plugin.
export const DEFAULT_TIERED_CREDIT_MAPPING: TieredCreditMapping = {
  fluxSchnell_generate: {
    tiers: [
      {
        name: "Basic",
        isDefault: true,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1,
            round: "ceil",
          },
        ],
      },
    ],
  },
  kling21_generate: {
    tiers: [
      {
        name: "Basic",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 20,
            round: "ceil",
          },
        ],
      },
    ],
  },
  nanoBananaPro_generate: {
    tiers: [
      {
        name: "4K",
        priority: 1,
        credits: 8,
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4K",
            },
          ],
        },
      },
      {
        name: "Standard Resolution",
        isDefault: true,
        credits: 4,
      },
    ],
  },
  nanoBanana2_generate: {
    tiers: [
      {
        name: "4K",
        priority: 1,
        credits: 5,
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4K",
            },
          ],
        },
      },
      {
        name: "2K",
        priority: 2,
        credits: 4,
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2K",
            },
          ],
        },
      },
      {
        name: "1K",
        priority: 3,
        credits: 4,
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1K",
            },
          ],
        },
      },
      {
        name: "0.5K",
        isDefault: true,
        credits: 4,
      },
    ],
  },
  gpt2_generate: {
    tiers: [
      {
        name: "4K High",
        priority: 1,
        credits: 29,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "high",
            },
          ],
        },
      },
      {
        name: "4K Medium",
        priority: 2,
        credits: 8,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "medium",
            },
          ],
        },
      },
      {
        name: "4K Low",
        priority: 3,
        credits: 4,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "low",
            },
          ],
        },
      },
      {
        name: "2K High",
        priority: 4,
        credits: 16,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "high",
            },
          ],
        },
      },
      {
        name: "2K Medium",
        priority: 5,
        credits: 4,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "medium",
            },
          ],
        },
      },
      {
        name: "2K Low",
        priority: 6,
        credits: 4,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "low",
            },
          ],
        },
      },
      {
        name: "1K High",
        priority: 7,
        credits: 16,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "high",
            },
          ],
        },
      },
      {
        name: "1K Medium",
        priority: 8,
        credits: 4,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1K",
            },
            {
              fact: "quality",
              operator: "equal",
              value: "medium",
            },
          ],
        },
      },
      {
        name: "1K Low",
        isDefault: true,
        credits: 4,
        meters: [
          {
            metric: "images",
            unitSize: 1,
            rate: 1.5,
            round: "ceil",
          },
        ],
      },
    ],
  },
  seedream5Pro_generate: {
    tiers: [
      {
        name: "1K",
        priority: 1,
        credits: 6,
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1K",
            },
          ],
        },
      },
      {
        name: "2K",
        isDefault: true,
        credits: 10,
      },
    ],
  },
  flux2Pro_generate: {
    tiers: [
      {
        name: "2K",
        priority: 1,
        credits: 6,
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2K",
            },
          ],
        },
      },
      {
        name: "1K",
        isDefault: true,
        credits: 4,
      },
    ],
  },
  qwen3_generate: {
    tiers: [
      {
        name: "2k",
        priority: 1,
        credits: 5,
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2k",
            },
          ],
        },
      },
      {
        name: "1k",
        isDefault: true,
        credits: 3,
      },
    ],
  },
  grokImagineImage_generate: {
    tiers: [
      {
        name: "2K",
        priority: 1,
        credits: 5,
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2k",
            },
          ],
        },
      },
      {
        name: "1K",
        isDefault: true,
        credits: 4,
      },
    ],
  },
  krea2_generate: {
    tiers: [
      {
        name: "Large",
        priority: 1,
        credits: 5,
        conditions: {
          all: [
            {
              fact: "quality",
              operator: "equal",
              value: "large",
            },
          ],
        },
      },
      {
        name: "Medium",
        isDefault: true,
        credits: 3,
      },
    ],
  },
  kling25_generate: {
    tiers: [
      {
        name: "720p",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
          ],
        },
      },
      {
        name: "1080p",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 5,
            round: "ceil",
          },
        ],
      },
    ],
  },
  klingv3_generate: {
    tiers: [
      {
        name: "4K",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 30,
            round: "ceil",
          },
        ],
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4K",
            },
          ],
        },
      },
      {
        name: "1080p Audio On",
        priority: 2,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 12,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "1080p Audio Off",
        priority: 3,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 8,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "720p Audio On",
        priority: 4,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 9,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "720p Audio Off",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 6,
            round: "ceil",
          },
        ],
      },
    ],
  },
  seedance2_generate: {
    tiers: [
      {
        name: "4k With input video",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 58,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4k",
            },
            {
              fact: "video",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "4k No input video",
        priority: 2,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 97,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "4k",
            },
            {
              fact: "video",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "1080p With input video",
        priority: 3,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 26,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
            {
              fact: "video",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "1080p No input video",
        priority: 4,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 43,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
            {
              fact: "video",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "720p With input video",
        priority: 5,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 12,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
            {
              fact: "video",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "720p No input video",
        priority: 6,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 19,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
            {
              fact: "video",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "480p With input video",
        priority: 7,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 6,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "480p",
            },
            {
              fact: "video",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "480p No input video",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 9,
            round: "ceil",
          },
        ],
      },
    ],
  },
  seedance25_generate: {
    tiers: [
      {
        name: "720p With input video",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 18,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
            {
              fact: "video",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "720p No input video",
        priority: 2,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 30,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
            {
              fact: "video",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "480p With input video",
        priority: 3,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 9,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "480p",
            },
            {
              fact: "video",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "480p No input video",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 14,
            round: "ceil",
          },
        ],
      },
    ],
  },
  veo31Fast_generate: {
    tiers: [
      {
        name: "Audio On 1080p",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 4,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
          ],
        },
      },
      {
        name: "Audio On 720p",
        priority: 2,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
          ],
        },
      },
      {
        name: "Audio Off 1080p",
        priority: 3,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "audio",
              operator: "equal",
              value: false,
            },
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
          ],
        },
      },
      {
        name: "Audio Off 720p",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 2.5,
            round: "ceil",
          },
        ],
      },
    ],
  },
  hailuo23_generate: {
    tiers: [
      {
        name: "Basic",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 35,
            round: "ceil",
          },
        ],
      },
    ],
  },
  wan25_generate: {
    tiers: [
      {
        name: "1080p",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 11,
            round: "ceil",
          },
        ],
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
          ],
        },
      },
      {
        name: "720p",
        priority: 2,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 8,
            round: "ceil",
          },
        ],
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
          ],
        },
      },
      {
        name: "480p",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 4,
            round: "ceil",
          },
        ],
      },
    ],
  },
  wan26_generate: {
    tiers: [
      {
        name: "1080p",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 10,
            round: "ceil",
          },
        ],
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
          ],
        },
      },
      {
        name: "720p",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 7,
            round: "ceil",
          },
        ],
      },
    ],
  },
  sora2_generate: {
    tiers: [
      {
        name: "Basic",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 8,
            round: "ceil",
          },
        ],
      },
    ],
  },
  ltx2Fast_generate: {
    tiers: [
      {
        name: "2160p",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 12,
            round: "ceil",
          },
        ],
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "2160p",
            },
          ],
        },
      },
      {
        name: "1440p",
        priority: 2,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 6,
            round: "ceil",
          },
        ],
        conditions: {
          any: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1440p",
            },
          ],
        },
      },
      {
        name: "1080p",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
      },
    ],
  },
  pixverse6_generate: {
    tiers: [
      {
        name: "1080p Audio On",
        priority: 1,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 8,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "1080p Audio Off",
        priority: 2,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 6,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "1080p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "720p Audio On",
        priority: 3,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 4,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "720p Audio Off",
        priority: 4,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "720p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "540p Audio On",
        priority: 5,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "540p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "540p Audio Off",
        priority: 6,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "540p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: false,
            },
          ],
        },
      },
      {
        name: "360p Audio On",
        priority: 7,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 3,
            round: "ceil",
          },
        ],
        conditions: {
          all: [
            {
              fact: "output_resolution",
              operator: "equal",
              value: "360p",
            },
            {
              fact: "audio",
              operator: "equal",
              value: true,
            },
          ],
        },
      },
      {
        name: "360p Audio Off",
        isDefault: true,
        meters: [
          {
            metric: "duration",
            unitSize: 1,
            rate: 2,
            round: "ceil",
          },
        ],
      },
    ],
  },
};
