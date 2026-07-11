import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAllGameplayFixtures, validateGameplayFixture } from "../src/testing/gameplayFixtures";
import { parseZustandPayload } from "../src/state/persistence";

async function main() {
  const outputDirectory = path.resolve("tests/playwright/fixtures");
  const outputPath = path.join(outputDirectory, "gameplay.generated.json");
  const fixtures = createAllGameplayFixtures();

  for (const fixture of Object.values(fixtures)) {
    parseZustandPayload(JSON.stringify(fixture.payload));
    const errors = validateGameplayFixture(fixture);
    if (errors.length > 0) throw new Error(`${fixture.name}: ${errors.join(", ")}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");
  console.log(`Generated and validated ${Object.keys(fixtures).length} gameplay fixtures at ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
