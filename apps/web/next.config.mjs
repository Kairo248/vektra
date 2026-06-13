/** @type {import('next').NextConfig} */
function backendOrigin() {
  let base = process.env.BACKEND_URL || "http://localhost:8080";
  base = base.replace(/\/$/, "");
  // Spring uses server.servlet.context-path=/api — destination already adds /api/.
  // If BACKEND_URL mistakenly includes /api, strip it to avoid /api/api/v1/... (404).
  if (base.endsWith("/api")) {
    base = base.slice(0, -4);
  }
  return base;
}

const nextConfig = {
  // Avoid Windows race where server chunks reference missing numeric files (e.g. ./948.js).
  experimental: {
    webpackBuildWorker: false,
  },
  async rewrites() {
    const backend = backendOrigin();
    return [
      {
        source: "/spring-api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
  webpack: (config) => {
    /*
     * @vladmandic/face-api ships a single ESM bundle that uses dynamic
     * `require()` to optionally pick up a TF.js native backend. Webpack
     * can't statically analyze it and emits a "Critical dependency"
     * warning on every build. The runtime behavior is fine — we never
     * hit that branch in the browser — so we suppress the noise here.
     */
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /node_modules[\\/]@vladmandic[\\/]face-api/,
        message: /Critical dependency: require function is used/,
      },
    ];
    return config;
  },
};

export default nextConfig;
