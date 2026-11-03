import { readFileSync } from "node:fs";
import type { TieredCreditMapping } from "../../src/credits/tieredCredits.js";

/**
 * The example TIERED_CREDIT_MAPPING in the README's "Credit pricing" section,
 * read from the README itself so the tests and the docs cannot drift apart.
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
  return JSON.parse(json) as TieredCreditMapping;
}
