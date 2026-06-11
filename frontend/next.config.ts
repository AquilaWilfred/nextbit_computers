import type { NextConfig } from "next";

// Match env priority with proxy.ts: explicit prod envs first, then fallback to localhost for dev
const CATALOGUE =
  process.env.CATALOGUE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.AXUM_GATEWAY_URL ??
  "http://127.0.0.1:8001";

const GATEWAY =
  process.env.AXUM_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.CATALOGUE_URL ??
  "http://127.0.0.1:8080";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.1', '192.168.100.2', 'localhost'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.cloudflare.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
  },
  compress: true,
  turbopack: {},

  async rewrites() {
    return [
      { source: '/ws/:path*', destination: `${CATALOGUE}/ws/:path*` },
      { source: '/api/technician/ws/:path*', destination: `${CATALOGUE}/api/technician/ws/:path*` },
      { source: '/api/auth/:path*', destination: `${CATALOGUE}/api/auth/:path*` },
      { source: '/api/admin/:path*', destination: `${CATALOGUE}/api/admin/:path*` },
      { source: '/api/insurance', destination: `${CATALOGUE}/api/insurance` },
      { source: '/api/insurance/:path*', destination: `${CATALOGUE}/api/insurance/:path*` },
      { source: '/api/admin/insurance', destination: `${CATALOGUE}/api/admin/insurance` },
      { source: '/api/admin/insurance/:path*', destination: `${CATALOGUE}/api/admin/insurance/:path*` },
      { source: '/api/technician/:path*', destination: `${CATALOGUE}/api/technician/:path*` },
      { source: '/api/repairs/:path*', destination: `${CATALOGUE}/api/repairs/:path*` },
      { source: '/api/tradein/:path*', destination: `${CATALOGUE}/api/tradein/:path*` },
      { source: '/api/categories', destination: `${CATALOGUE}/api/categories/` },
      { source: '/api/categories/:path*', destination: `${CATALOGUE}/api/categories/:path*` },
      { source: '/api/orders/:path*', destination: `${CATALOGUE}/api/orders/:path*` },
      { source: '/api/cart/:path*', destination: `${CATALOGUE}/api/cart/:path*` },
      { source: '/api/products/:path*', destination: `${CATALOGUE}/api/products/:path*` },
      { source: '/api/wishlist/:path*', destination: `${CATALOGUE}/api/wishlist/:path*` },
      { source: '/api/settings/:path*', destination: `${CATALOGUE}/api/settings/:path*` },
      { source: '/api/branches/:path*', destination: `${CATALOGUE}/api/branches/:path*` },
      { source: '/api/delivery/:path*', destination: `${CATALOGUE}/api/delivery/:path*` },
      { source: '/api/content/:path*', destination: `${CATALOGUE}/api/content/:path*` },
      { source: '/api/customers/:path*', destination: `${CATALOGUE}/api/customers/:path*` },
      { source: '/api/addresses/:path*', destination: `${CATALOGUE}/api/addresses/:path*` },
      { source: '/api/vip', destination: `${CATALOGUE}/api/vip` },
      { source: '/api/vip/:path*', destination: `${CATALOGUE}/api/vip/:path*` },
      { source: '/api/admin/vip', destination: `${CATALOGUE}/api/admin/vip` },
      { source: '/api/admin/vip/:path*', destination: `${CATALOGUE}/api/admin/vip/:path*` },
    ];
  },
};

export default nextConfig;
