import RegisterPage from '@/components/pages/RegisterPage';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

export const metadata = {
  title: 'Create Your Delan Account | Join India\'s Fashion Community',
  description: 'Create your Delan account to track orders, save addresses, and enjoy a personalised women\'s fashion shopping experience.',
  alternates: { canonical: `${SITE_URL}/account/register` },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RegisterPage />;
}
