import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * CalVer build version: `YYYY.MM.DD.BUILD` from `.build-counter.json`
 * (bumped by CI on PR merges to `main`).
 *
 * On preview / non-production deploys we append the first 7 chars of the
 * Vercel commit SHA so every preview has a unique, identifiable version.
 * Production (main) stays clean.
 *
 * Priority:
 *   1. counter file present + production → "2026.04.04.12"
 *   2. counter file present + preview     → "2026.04.04.12·a3f21bc"
 *   3. counter missing + preview          → "dev·a3f21bc"
 *   4. counter missing + local dev        → "dev"
 */
function generateVersion(): string {
  let base = "dev";
  try {
    const dir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
    const counterPath = resolve(dir, ".build-counter.json");
    const raw = readFileSync(counterPath, "utf-8");
    const { date, build } = JSON.parse(raw);
    base = `${date}.${build}`;
  } catch {
    // counter file missing — leave base as "dev"
  }

  const vercelEnv = process.env.VERCEL_ENV;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelEnv && vercelEnv !== "production" && sha) {
    return `${base}\u00B7${sha.slice(0, 7)}`;
  }
  return base;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
