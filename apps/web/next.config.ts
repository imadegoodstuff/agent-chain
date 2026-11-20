import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Keep the markdown docs + devnet deployment file out of the standalone trace
  // (they are copied explicitly by the Dockerfile and read with fs at runtime).
  outputFileTracingExcludes: {
    "*": ["./node_modules/@swc/core-linux-x64-gnu", "./node_modules/@swc/core-linux-x64-musl"],
  },
};

export default nextConfig;
