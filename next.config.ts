import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// CalVer: YYYY.MM.DD.BUILD — read entirely from .build-counter.json (committed by CI on each PR merge)
function generateVersion(): string {
  try {
    const dir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
    const counterPath = resolve(dir, ".build-counter.json");
    const raw = readFileSync(counterPath, "utf-8");
    const { date, build } = JSON.parse(raw);
    return `${date}.${build}`;
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
