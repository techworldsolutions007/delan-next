import PrivacyPolicy from '@/components/pages/PrivacyPolicy';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/privacy-policy`;

export const metadata = {
  title: 'Privacy Policy | Delan — How We Protect Your Data',
  description: 'Read Delan\'s privacy policy — how we collect, use, store, and protect your personal information when you shop on delan.in.',
  alternates: { canonical: PAGE_URL },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Privacy Policy | Delan',
    description: 'How Delan collects, uses, and protects your personal information.',
    type: 'website',
    url: PAGE_URL,
  },
};

export default function Page() {
  return <PrivacyPolicy />;
}
