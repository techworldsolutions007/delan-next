import TermsCondition from '@/components/pages/TermsCondition';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';
const PAGE_URL = `${SITE_URL}/terms-conditions`;

export const metadata = {
  title: 'Terms & Conditions | Delan — Website & Purchase Terms',
  description: 'Read the terms and conditions governing your use of Delan\'s website and purchase of our women\'s fashion products. Know your rights and obligations.',
  alternates: { canonical: PAGE_URL },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Terms & Conditions | Delan',
    description: 'Terms governing use of Delan\'s website and purchase of our products.',
    type: 'website',
    url: PAGE_URL,
  },
};

export default function Page() {
  return <TermsCondition />;
}
