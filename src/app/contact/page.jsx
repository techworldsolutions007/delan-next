import Contact from '@/components/pages/Contact';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/contact`;

export const metadata = {
  title: 'Contact Delan | Customer Support — Orders, Returns & Styling Help',
  description: 'Reach Delan\'s customer support for help with orders, returns, sizing & more. Email support@delanonline.com or call +91 93103 29849. We\'re here to help.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Contact Delan | Customer Support — Orders, Returns & Styling Help',
    description: 'Get in touch with Delan — we\'re here to help with orders, styling advice, and any questions about our collections.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Contact Delan Customer Support' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Delan | Customer Support',
    description: 'Get in touch with Delan for orders, returns, and styling help.',
    images: ['/og-default.jpg'],
  },
};

const jsonLdBlocks = [
  {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Delan — Customer Support',
    description: 'Reach Delan\'s customer support for help with orders, returns, sizing, and styling.',
    url: PAGE_URL,
    publisher: {
      '@type': 'Organization',
      name: 'Delan',
      url: SITE_URL,
      telephone: '+91-93103-29849',
      email: 'support@delanonline.com',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/delan-logo.png` },
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Contact Us', item: PAGE_URL },
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
      <Contact />
    </>
  );
}
