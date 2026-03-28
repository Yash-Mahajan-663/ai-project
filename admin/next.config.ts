import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/admin',
  async rewrites() {
    // Only proxy to local backend in development; in production, vercel.json handles routing
    if (process.env.NODE_ENV !== 'development') {
      return { beforeFiles: [] };
    }
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
          basePath: false,
        },
        {
          source: '/webhook',
          destination: 'http://localhost:5000/webhook',
          basePath: false,
        },
      ],
    };
  },
};

export default nextConfig;

