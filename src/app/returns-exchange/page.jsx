import ReturnExchange from '@/components/pages/ReturnExchange';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/returns-exchange`;

export const metadata = {
  title: 'Returns & Exchange Policy | Delan — 7-Day Hassle-Free Returns',
  description: 'Delan\'s 7-day return and exchange policy. Easy size swaps, hassle-free refunds. Learn how to initiate a return or exchange for your women\'s fashion order.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Returns & Exchange Policy | Delan — 7-Day Hassle-Free Returns',
    description: 'Delan\'s hassle-free 7-day returns & exchange policy — easy refunds and smooth size exchanges for all women\'s fashion orders.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan Returns & Exchange Policy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Returns & Exchange Policy | Delan',
    description: '7-day hassle-free returns & exchange policy for all Delan orders.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Returns & Exchange Policy — Delan',
    description: '7-day hassle-free return and exchange policy for all Delan women\'s fashion orders.',
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
      { '@type': 'ListItem', position: 2, name: 'Returns & Exchange', item: PAGE_URL },
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
      <ReturnExchange />
    </>
  );
}
