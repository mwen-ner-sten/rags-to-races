import type { NextConfig } from "next";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// CalVer: YYYY.MM.DD.BUILD — auto-increments build number per day
function generateVersion(): string {
  const counterPath = resolve(__dirname, ".build-counter.json");
  const now = new Date();
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  let build = 1;
  try {
    const raw = readFileSync(counterPath, "utf-8");
    const prev = JSON.parse(raw);
    if (prev.date === date) {
      build = (prev.build ?? 0) + 1;
    }
  } catch {
    // First run or missing file
  }

  writeFileSync(counterPath, JSON.stringify({ date, build }, null, 2) + "\n");
  return `${date}.${build}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
