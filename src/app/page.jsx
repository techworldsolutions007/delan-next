import Home from '@/components/pages/Home';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

export const metadata = {
  title: 'Women\'s Fashion India — Co-ord Sets, Dresses & Ethnic Wear',
  description: 'Shop Delan\'s premium women\'s fashion online. Discover co-ord sets, floral dresses, ethnic wear & contemporary styles. COD available. Fast shipping across India.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Delan | Women\'s Fashion India — Co-ord Sets, Dresses & Ethnic Wear',
    description: 'Discover India\'s premium women\'s fashion. Co-ord sets, floral dresses, ethnic wear & contemporary styles. COD · Fast shipping · 7-day returns.',
    type: 'website',
    url: SITE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan — Premium Women\'s Fashion India' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Delan | Women\'s Fashion India',
    description: 'Co-ord sets, dresses, ethnic wear & contemporary styles for the modern Indian woman.',
    images: ['/og-default.jpg'],
  },
};

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Delan — Premium Women\'s Fashion India',
  description: 'Shop co-ord sets, floral dresses, ethnic wear & contemporary women\'s fashion online in India.',
  url: SITE_URL,
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    ],
  },
  publisher: {
    '@type': 'Organization',
    name: 'Delan',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/delan-logo.png` },
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <Home />
    </>
  );
}
