/** @type {import('next').NextConfig} */
// Served behind Nginx at http(s)://<host>/factory — basePath keeps routes and assets consistent.
const factoryBasePath = "/factory";

function backendOrigin() {
  let base = process.env.BACKEND_URL || "http://localhost:8080";
  base = base.replace(/\/$/, "");
  if (base.endsWith("/api")) {
    base = base.slice(0, -4);
  }
  return base;
}

const nextConfig = {
  basePath: factoryBasePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: factoryBasePath,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  async rewrites() {
    const backend = backendOrigin();
    return [
      {
        source: "/spring-api/:path*",
        destination: `${backend}/api/:path*`,
        basePath: false,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/factory",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
