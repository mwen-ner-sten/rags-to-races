import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// CalVer: YYYY.MM.DD.BUILD — build number is incremented by the bump-build CI workflow on each PR merge
function generateVersion(): string {
  const now = new Date();
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  let build = 1;
  try {
    const dir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
    const counterPath = resolve(dir, ".build-counter.json");
    const raw = readFileSync(counterPath, "utf-8");
    const prev = JSON.parse(raw);
    if (prev.date === date) {
      build = prev.build ?? 1;
    }
  } catch {
    // Missing or unreadable counter — fall back to 1
  }

  return `${date}.${build}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
