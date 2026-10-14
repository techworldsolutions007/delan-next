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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delan.in';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Delan | Premium Women\'s Fashion India',
    template: '%s | Delan',
  },
  description: 'Shop Delan — India\'s premium women\'s fashion brand. Discover co-ord sets, floral dresses, ethnic wear & contemporary styles for the modern Indian woman. COD available.',
  keywords: [
    'women\'s fashion India', 'co-ord sets online', 'ethnic wear India',
    'floral dresses women', 'women clothing online India', 'Delan fashion',
    'premium women\'s clothing', 'Indian fashion brand', 'women western wear',
    'contemporary women fashion', 'buy dresses online India',
  ],
  authors: [{ name: 'Delan', url: SITE_URL }],
  creator: 'Delan',
  publisher: 'Delan',
  alternates: { canonical: SITE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Delan',
    title: 'Delan | Premium Women\'s Fashion India',
    description: 'Shop India\'s premium women\'s fashion — co-ord sets, ethnic wear, dresses & contemporary styles crafted for the modern Indian woman.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan — Premium Women\'s Fashion India' }],
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@delan_in',
    title: 'Delan | Premium Women\'s Fashion India',
    description: 'Co-ord sets, dresses, ethnic wear & contemporary styles for the modern Indian woman.',
    images: ['/og-default.jpg'],
  },
  verification: {
    google: '',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#642c44',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Delan',
  alternateName: 'Delan Fashion India',
  url: SITE_URL,
  description: 'Premium women\'s fashion India — co-ord sets, dresses, ethnic wear',
  inLanguage: 'en-IN',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Delan',
  alternateName: 'Delan Fashion',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logos/delan-logo.png`,
    width: 200,
    height: 60,
  },
  description: 'India\'s premium women\'s fashion brand — co-ord sets, dresses, ethnic wear & contemporary styles crafted for the modern Indian woman.',
  foundingDate: '2022',
  areaServed: 'IN',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'IN',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+91-93103-29849',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
    {
      '@type': 'ContactPoint',
      email: 'support@delanonline.com',
      contactType: 'customer support',
    },
  ],
  sameAs: [
    'https://www.instagram.com/delan.in',
    'https://www.facebook.com/delan.in',
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN">
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
        {/* Global structured data — sitewide */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className={`${montserrat.variable} ${cormorantGaramond.variable}`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
