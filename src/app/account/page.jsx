import Account from '@/components/pages/Account';

export const metadata = {
  title: 'My Account',
  description: 'Manage your Delan account — view orders, addresses, and profile settings.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Account />;
}
