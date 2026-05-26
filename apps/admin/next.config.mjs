/** @type {import('next').NextConfig} */
// Served behind Nginx at http(s)://<host>/admin — basePath keeps routes and assets consistent.
const adminBasePath = "/admin";

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
  basePath: adminBasePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: adminBasePath,
  },
  // Avoid Windows race where server chunks reference missing numeric files (e.g. ./948.js).
  experimental: {
    webpackBuildWorker: false,
  },
  async rewrites() {
    const backend = backendOrigin();
    return [
      {
        // basePath: false keeps the source at /spring-api/* instead of being
        // auto-prefixed to /admin/spring-api/*. The browser-side API client
        // calls /spring-api/* directly (no /admin prefix), so the rewrite
        // must match without the basePath.
        source: "/spring-api/:path*",
        destination: `${backend}/api/:path*`,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
