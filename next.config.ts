import type { NextConfig } from "next";

// BASE_PATH is set by .github/workflows/deploy.yml from the repository name,
// because GitHub Pages serves the site under /<repo>/. Locally it is empty.
const basePath = process.env.BASE_PATH && process.env.BASE_PATH !== "/" ? process.env.BASE_PATH : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
