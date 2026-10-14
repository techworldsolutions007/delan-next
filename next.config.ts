import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@shopify/hydrogen-react'],
  experimental: {
    optimizePackageImports: ['framer-motion', 'motion', 'lucide-react', '@radix-ui/react-icons', 'react-icons'],
  },
  images: {
    // Shopify's CDN already applies transforms (maxWidth, format) server-side.
    // Vercel Services routes /_next/image through the service rewrite layer,
    // which bypasses Vercel's built-in optimizer. Disabling avoids broken images.
    unoptimized: true,
    remotePatterns: [
      new URL('https://*.myshopify.com/**'),
      new URL('https://cdn.shopify.com/**'),
      new URL('https://cdn.shopifycloud.com/**'),
    ],
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
