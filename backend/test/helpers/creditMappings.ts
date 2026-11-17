import { readFileSync } from "node:fs";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../../src/credits/defaultTieredCreditMapping.js";
import type { TieredCreditMapping } from "../../src/credits/tieredCredits.js";

/**
 * The example TIERED_CREDIT_MAPPING in the README's "Credit pricing" section,
 * read from the README itself so the tests and the docs cannot drift apart,
 * layered over the default mapping for the models the example leaves out.
 * kling21 has a default "Basic" tier and an "Image to video" tier.
 */
export function readmeExampleMapping(): TieredCreditMapping {
  const readme = readFileSync(
    new URL("../../README.md", import.meta.url),
    "utf8",
  );
  const section = readme.slice(readme.indexOf("## Credit pricing"));
  const json = /```json\n([\s\S]*?)```/.exec(section)?.[1];
  if (!json) throw new Error("README has no example credit mapping");
  // The example shows two models; every other model keeps its default entry,
  // since a mapping must price every registered model.
  return {
    ...DEFAULT_TIERED_CREDIT_MAPPING,
    ...(JSON.parse(json) as TieredCreditMapping),
  };
}
