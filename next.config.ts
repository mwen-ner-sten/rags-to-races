import type { NextConfig } from "next";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// CalVer: YYYY.MM.DD.BUILD — auto-increments build number per day
function generateVersion(): string {
  const now = new Date();
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  // On CI/Vercel the filesystem may be read-only, so gracefully fall back
  let build = 1;
  let counterPath: string;
  try {
    const dir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
    counterPath = resolve(dir, ".build-counter.json");
  } catch {
    return `${date}.1`;
  }

  try {
    const raw = readFileSync(counterPath, "utf-8");
    const prev = JSON.parse(raw);
    if (prev.date === date) {
      build = (prev.build ?? 0) + 1;
    }
  } catch {
    // First run or missing file
  }

  try {
    writeFileSync(counterPath, JSON.stringify({ date, build }, null, 2) + "\n");
  } catch {
    // Read-only filesystem (CI) — skip writing
  }

  return `${date}.${build}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
