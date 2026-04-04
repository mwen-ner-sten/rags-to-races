import type { NextConfig } from "next";
import { execSync } from "child_process";

// CalVer: YYYY.MM.DD.HHmm derived from the git commit timestamp
function generateVersion(): string {
  try {
    const iso = execSync("git log -1 --format=%aI", { encoding: "utf-8" }).trim();
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const mi = String(d.getUTCMinutes()).padStart(2, "0");
    return `${y}.${mo}.${day}.${h}${mi}`;
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
