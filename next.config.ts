import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@shopify/hydrogen-react'],
  experimental: {
    optimizePackageImports: ['framer-motion', 'motion', 'lucide-react', '@radix-ui/react-icons', 'react-icons'],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.myshopify.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080, 1200, 1920],
  },
  async headers() {
    return [
      {
        // Long-term cache for immutable Next.js build assets
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Cache public static assets (icons, logos, images, models)
        source: "/:path(icons|logos|images|models)/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
