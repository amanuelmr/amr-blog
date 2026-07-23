/** @type {import('next').NextConfig} */

// Backend origin to proxy to. Override with BACKEND_URL in the environment.
const BACKEND_URL =
  process.env.BACKEND_URL || "https://amr-blog-backend.vercel.app";

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Same-origin proxy: the browser calls /api/* on the frontend domain, and
  // Next proxies it to the backend. This removes CORS entirely and makes the
  // auth cookies first-party. (Set NEXT_PUBLIC_API_URL=/api/v1 in production.)
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/swagger-ui", destination: `${BACKEND_URL}/swagger-ui` },
      { source: "/swagger.json", destination: `${BACKEND_URL}/swagger.json` },
    ];
  },
};

export default nextConfig;
