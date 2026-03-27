import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/admin',
  // Local rewrites are not needed in production as vercel.json handles routing
  // But we can keep them for local dev if needed, or better, use relative paths
};

export default nextConfig;
