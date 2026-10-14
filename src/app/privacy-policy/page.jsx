import PrivacyPolicy from '@/components/pages/PrivacyPolicy';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Read Delan\'s privacy policy — how we collect, use, and protect your personal information.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Privacy Policy | Delan',
    description: 'Read Delan\'s privacy policy — how we collect, use, and protect your personal information.',
    type: 'website',
  },
};

export default function Page() {
  return <PrivacyPolicy />;
}
