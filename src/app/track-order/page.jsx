import TrackOrder from '@/components/TrackOrder';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/track-order`;

export const metadata = {
  title: 'Track Your Delan Order | Live Shipping Status India',
  description: 'Track your Delan women\'s fashion order in real time. Enter your order number or AWB to get live delivery updates from our courier partners across India.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Track Your Delan Order | Live Shipping Status India',
    description: 'Get real-time shipping updates for your Delan order. Enter your order ID or AWB number.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Track Delan Order' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Track Your Delan Order',
    description: 'Live shipping status for your Delan fashion order.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Track Your Delan Order — Live Shipping Status',
    description: 'Real-time order tracking for Delan women\'s fashion deliveries across India.',
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
      { '@type': 'ListItem', position: 2, name: 'Track Order', item: PAGE_URL },
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
      <TrackOrder />
    </>
  );
}
