import type { NextConfig } from "next";

/**
 * Build version string surfaced as `NEXT_PUBLIC_BUILD_VERSION`.
 *
 * Format: `YYYY.MM.DD-<sha7>` on any Vercel deploy (prod or preview),
 * `dev` locally. The build date is captured at `next build` time; the
 * short SHA comes from `VERCEL_GIT_COMMIT_SHA`.
 *
 * This replaces the old `.build-counter.json` + `bump-build.yml` system,
 * which required pushing directly to `main` and was incompatible with
 * our pull-request-required branch protection.
 */
function generateVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  if (!sha) return "dev";

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${d}-${sha}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
