import FabricPage from '@/components/pages/FabricPage';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/fabric-care`;

export const metadata = {
  title: 'Fabric Care Guide | How to Care for Your Delan Garments',
  description: 'Learn how to wash, dry & store your Delan garments. Care tips for cotton, silk, chiffon & more — keep your women\'s fashion looking new for longer.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Fabric Care Guide | How to Care for Your Delan Garments',
    description: 'Washing, drying, and storage tips for every Delan fabric — keep your women\'s fashion looking fresh and lasting longer.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan Fabric Care Guide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fabric Care Guide | Delan',
    description: 'Wash, dry & store your Delan garments the right way. Care tips for every fabric.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Care for Your Delan Garments',
    description: 'Step-by-step fabric care guide for Delan women\'s fashion — washing, drying, and storage instructions for cotton, silk, chiffon, and more.',
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
      { '@type': 'ListItem', position: 2, name: 'Fabric Care Guide', item: PAGE_URL },
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
      <FabricPage />
    </>
  );
}
