import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Turbopack config (used in production builds)
  turbopack: {},

  // Webpack config (used in dev via --webpack flag).
  // Excludes SQLite DB files from file watching to prevent
  // an infinite HMR recompile loop caused by DB journal writes.
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /node_modules|\.db$|\.db-journal$|\.db-wal$|\.db-shm$|[\\/]data[\\/]/,
    };
    return config;
  },
};

export default nextConfig;



