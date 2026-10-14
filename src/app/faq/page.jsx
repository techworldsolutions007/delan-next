import FAQ from '@/components/pages/FAQ';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/faq`;

export const metadata = {
  title: 'FAQs — Shipping, Returns, Payments & Sizing | Delan',
  description: 'Answers to your top questions about Delan: shipping timelines, 7-day return policy, COD, payment options, size guide & order tracking. Get help fast.',
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'FAQs — Shipping, Returns, Payments & Sizing | Delan',
    description: 'Find answers to frequently asked questions about Delan — shipping, returns, payments, COD, sizing, and more.',
    type: 'website',
    url: PAGE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan FAQs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQs | Delan',
    description: 'Shipping, returns, payments, COD, sizing & order tracking questions answered.',
    images: ['/og-default.jpg'],
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  name: 'Frequently Asked Questions — Delan',
  url: PAGE_URL,
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What payment methods does Delan accept?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Delan accepts all major credit cards, debit cards, UPI, net banking, and popular digital wallets through our secure payment gateway. Cash on Delivery (COD) is also available on eligible orders.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does shipping take for Delan orders?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Standard shipping typically takes 10–12 business days for most locations within India. Express orders from our Ready to Ship collection may arrive sooner. You can track your order using the Track Order page.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is Delan\'s return and exchange policy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Delan offers a 7-day return policy for refunds and a 7-day exchange policy for size or colour changes from the date of delivery. Items must be unused, unwashed, and in original packaging with tags intact. Visit the Returns & Exchanges page for full details.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can I track my Delan order?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Once your order is shipped, you will receive an email and SMS with your tracking number and a link to the courier\'s website. You can also use the Track Order feature on our website at delan.in/track-order.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Delan ship internationally?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Currently, Delan ships within India only. We are working on expanding our delivery services to international locations in the near future.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I contact Delan\'s customer support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can reach our customer support team by emailing support@delanonline.com or by calling +91 93103 29849. Our team is available Monday–Saturday, 10 AM–6 PM IST.',
      },
    },
  ],
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'FAQs', item: PAGE_URL },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <FAQ />
    </>
  );
}
