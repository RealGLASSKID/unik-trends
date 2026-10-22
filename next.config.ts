import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase ships as ESM; force transpile so Webpack interop helpers work
  transpilePackages: [
    "firebase",
    "@firebase/app",
    "@firebase/auth",
    "@firebase/firestore",
    "@firebase/util",
    "@firebase/component",
    "@firebase/logger",
    "@firebase/webchannel-wrapper",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
