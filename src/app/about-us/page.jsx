import AboutUs from '@/components/pages/AboutUs';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/about-us`;

export const metadata = {
  title: 'About Delan | Our Story — Premium Women\'s Fashion Brand India',
  description: 'Discover the story behind Delan — India\'s premium women\'s fashion brand. We craft timeless co-ord sets, dresses & ethnic wear with quality fabrics for the modern Indian woman.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'About Delan | Our Story — Premium Women\'s Fashion Brand India',
    description: 'Learn about Delan — our values, craftsmanship, and commitment to premium women\'s fashion for the modern Indian woman.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'About Delan — Women\'s Fashion Brand India' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Delan | Our Story',
    description: 'India\'s premium women\'s fashion brand — our story, values, and craftsmanship.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Delan — Premium Women\'s Fashion Brand India',
    description: 'Delan is India\'s premium women\'s fashion brand crafting co-ord sets, dresses & ethnic wear for the modern Indian woman.',
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
      { '@type': 'ListItem', position: 2, name: 'About Us', item: PAGE_URL },
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
      <AboutUs />
    </>
  );
}
