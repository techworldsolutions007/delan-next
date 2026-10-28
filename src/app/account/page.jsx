import Account from '@/components/pages/Account';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

export const metadata = {
  title: 'My Account',
  description: 'Manage your Delan account | view orders, addresses, and profile settings.',
  alternates: { canonical: `${SITE_URL}/account` },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Account />;
}
