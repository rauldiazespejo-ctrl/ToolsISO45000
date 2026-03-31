import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel usa su propio empaquetado; standalone solo para Electron / Node local.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
