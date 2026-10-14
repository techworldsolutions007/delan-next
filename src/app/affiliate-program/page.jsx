import AffiliatePage from '@/components/pages/AffiliatePage';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/affiliate-program`;

export const metadata = {
  title: 'Earn with Delan | Women\'s Fashion Affiliate Program India',
  description: 'Join Delan\'s affiliate program and earn commissions promoting premium women\'s fashion. Ideal for influencers, bloggers, and fashion enthusiasts across India. Apply today.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Earn with Delan | Women\'s Fashion Affiliate Program India',
    description: 'Earn commissions by sharing Delan styles you love. Perfect for influencers and fashion enthusiasts across India.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan Affiliate Program India' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Earn with Delan | Affiliate Program',
    description: 'Earn commissions promoting premium women\'s fashion. Join the Delan affiliate program.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Delan Affiliate Program — Earn Commissions on Women\'s Fashion',
    description: 'Join Delan\'s affiliate program and earn commissions by promoting premium women\'s fashion to your audience.',
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
      { '@type': 'ListItem', position: 2, name: 'Affiliate Program', item: PAGE_URL },
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
      <AffiliatePage />
    </>
  );
}
