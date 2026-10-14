import TermsCondition from '@/components/pages/TermsCondition';

export const metadata = {
  title: 'Terms & Conditions',
  description: 'Read the terms and conditions governing your use of Delan\'s website and purchase of our products.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Terms & Conditions | Delan',
    description: 'Read the terms and conditions governing your use of Delan\'s website and purchase of our products.',
    type: 'website',
  },
};

export default function Page() {
  return <TermsCondition />;
}
