import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { formatVersion } from "./src/lib/build-version";

// CalVer: YYYY.MM.DD.BUILD — build number is incremented by the bump-build CI workflow on each PR merge
function generateVersion(): string {
  let build = 1;
  try {
    const dir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
    const counterPath = resolve(dir, ".build-counter.json");
    const raw = readFileSync(counterPath, "utf-8");
    const prev = JSON.parse(raw);
    build = prev.build ?? 1;
  } catch {
    // Missing or unreadable counter — fall back to 1
  }

  return formatVersion(new Date(), build);
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
