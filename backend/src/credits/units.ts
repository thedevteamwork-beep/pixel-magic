// The units a model can bill in. Adding a unit means editing this file, then
// giving the model that bills in it `billing.units` and a matching fact.
export const SUPPORTED_UNITS = {
  duration: { label: "seconds" },
  images: { label: "images" },
} as const;

export type SupportedUnit = keyof typeof SUPPORTED_UNITS;

/** Every unit name, for validators. */
export const UNIT_NAMES = Object.keys(SUPPORTED_UNITS) as [
  SupportedUnit,
  ...SupportedUnit[],
];
