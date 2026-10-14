import { Montserrat, Cormorant_Garamond } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  variable: '--font-montserrat',
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delan.in'),
  title: {
    default: 'Delan — Premium Women\'s Fashion',
    template: '%s | Delan',
  },
  description: 'Delan offers premium women\'s fashion — co-ord sets, ethnic wear, and contemporary styles crafted for the modern woman.',
  keywords: ['women fashion', 'co-ord sets', 'ethnic wear', 'Delan', 'premium clothing India'],
  authors: [{ name: 'Delan' }],
  creator: 'Delan',
  publisher: 'Delan',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Delan',
    title: 'Delan — Premium Women\'s Fashion',
    description: 'Delan offers premium women\'s fashion — co-ord sets, ethnic wear, and contemporary styles crafted for the modern woman.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan Fashion' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Delan — Premium Women\'s Fashion',
    description: 'Premium women\'s fashion — co-ord sets, ethnic wear, and contemporary styles.',
    images: ['/og-default.jpg'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#642c44',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Shopify CDN so image/video fetches start immediately */}
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com" />
        {/* Preload the hero poster — keep in sync with HERO_POSTER in HeroSection.jsx */}
        <link
          rel="preload"
          as="image"
          href="https://cdn.shopify.com/s/files/1/0714/4420/1639/files/WhatsApp_Image_2026-07-13_at_1.10.42_PM.jpg?v=1783928461"
        />
      </head>
      <body className={`${montserrat.variable} ${cormorantGaramond.variable}`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
