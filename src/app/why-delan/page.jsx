import WhyDelan from '@/components/pages/WhyDelan';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/why-delan`;

export const metadata = {
  title: 'Why Choose Delan | Quality Women\'s Fashion Made for India',
  description: 'See why thousands of Indian women trust Delan — premium fabrics, inclusive sizing, ethical manufacturing & styles that last beyond seasons. Shop with confidence.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Why Choose Delan | Quality Women\'s Fashion Made for India',
    description: 'Discover why thousands of women choose Delan — premium fabrics, thoughtful fits, ethical production & designs made to last.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Why Choose Delan — Quality Women\'s Fashion' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why Choose Delan | Quality Women\'s Fashion',
    description: 'Premium fabrics, inclusive sizing, ethical manufacturing — discover the Delan difference.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Why Choose Delan — Quality Women\'s Fashion Made for India',
    description: 'Premium fabrics, inclusive sizing, ethical manufacturing, and styles that last beyond seasons.',
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
      { '@type': 'ListItem', position: 2, name: 'Why Delan', item: PAGE_URL },
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
      <WhyDelan />
    </>
  );
}
