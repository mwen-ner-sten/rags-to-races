import type { NextConfig } from "next";
import { execSync } from "child_process";

// CalVer: YYYY.MM.DD.N — N is the total git commit count, always increasing
function generateVersion(): string {
  const now = new Date();
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  let build = 1;
  try {
    build = parseInt(execSync("git rev-list --count HEAD").toString().trim(), 10);
  } catch {
    // Not in a git repo or git unavailable — fall back to 1
  }

  return `${date}.${build}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_VERSION: generateVersion(),
  },
};

export default nextConfig;
