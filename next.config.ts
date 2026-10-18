import { mkdirSync, writeFileSync } from "node:fs";
import type { NextConfig } from "next";

// Each build gets an id, baked into the pages and published as version.json,
// so an open page (like the iPhone Home Screen app) can tell a newer version
// is live and offer to reload.
const buildId = process.env.GITHUB_SHA?.slice(0, 12) || String(Date.now());
mkdirSync("public", { recursive: true });
writeFileSync("public/version.json", JSON.stringify({ id: buildId }));

// BASE_PATH is set by .github/workflows/deploy.yml from the repository name,
// because GitHub Pages serves the site under /<repo>/. Locally it is empty.
const basePath = process.env.BASE_PATH && process.env.BASE_PATH !== "/" ? process.env.BASE_PATH : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_BUILD_ID: buildId },
};

export default nextConfig;
