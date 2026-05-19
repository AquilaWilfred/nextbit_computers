import type { NextConfig } from "next";

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
  output: 'standalone',
  turbopack: {},

  async rewrites() {
    return [
      { source: '/ws/:path*', destination: 'http://127.0.0.1:8001/ws/:path*' },
      { source: '/api/technician/ws/:path*', destination: 'http://127.0.0.1:8001/api/technician/ws/:path*',},
      { source: '/api/auth/:path*', destination: 'http://127.0.0.1:8001/api/auth/:path*' },
      { source: '/api/admin/:path*', destination: 'http://127.0.0.1:8001/api/admin/:path*' },
      
      // ✅ ADD TECHNICIAN AND REPAIRS ROUTES HERE
      { source: '/api/technician/:path*', destination: 'http://127.0.0.1:8001/api/technician/:path*' },
      { source: '/api/repairs/:path*', destination: 'http://127.0.0.1:8001/api/repairs/:path*' },
      { source: '/api/categories', destination: 'http://127.0.0.1:8001/api/categories/' },
      { source: '/api/categories/:path*', destination: 'http://127.0.0.1:8001/api/categories/:path*' },
      { source: '/api/orders/:path*', destination: 'http://127.0.0.1:8001/api/orders/:path*' },
      { source: '/api/cart/:path*', destination: 'http://127.0.0.1:8001/api/cart/:path*' },
      { source: '/api/products/:path*', destination: 'http://127.0.0.1:8001/api/products/:path*' },
      { source: '/api/wishlist/:path*', destination: 'http://127.0.0.1:8001/api/wishlist/:path*' },
      { source: '/api/settings/:path*', destination: 'http://127.0.0.1:8001/api/settings/:path*' },
      { source: '/api/branches/:path*', destination: 'http://127.0.0.1:8001/api/branches/:path*' },
      { source: '/api/delivery/:path*', destination: 'http://127.0.0.1:8001/api/delivery/:path*' },
      { source: '/api/content/:path*', destination: 'http://127.0.0.1:8001/api/content/:path*' },
      { source: '/api/customers/:path*', destination: 'http://127.0.0.1:8001/api/customers/:path*' },
      { source: '/api/addresses/:path*', destination: 'http://127.0.0.1:8001/api/addresses/:path*' },
    ];
  },
};

export default nextConfig;