import ShippingPolicy from '@/components/pages/ShippingPolicy';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/shipping-policy`;

export const metadata = {
  title: 'Shipping Policy | Delan — Pan India Delivery Information',
  description: 'Delan ships across India. Learn about shipping timelines (10–12 days), courier partners, COD availability, free shipping thresholds & live order tracking.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Shipping Policy | Delan — Pan India Delivery Information',
    description: 'Delan shipping policy — fast delivery across India, COD, free shipping on eligible orders, and real-time order tracking.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan Shipping Policy India' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shipping Policy | Delan',
    description: 'Pan India delivery — shipping timelines, COD, free shipping & tracking.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Shipping Policy — Delan',
    description: 'Delan ships pan India in 10–12 business days. COD available. Track your order live.',
    url: PAGE_URL,
    publisher: {
      '@type': 'Organization',
      name: 'Delan',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/delan-logo.png` },
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shipping Policy', item: PAGE_URL },
    ],
  },
];

export default function Page() {
  return (
    <>
      {jsonLdBlocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <ShippingPolicy />
    </>
  );
}
