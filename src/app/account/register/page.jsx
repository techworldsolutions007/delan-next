import RegisterPage from '@/components/pages/RegisterPage';

export const metadata = {
  title: 'Create Account',
  description: 'Create your Delan account to track orders, save addresses, and enjoy a personalised shopping experience.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RegisterPage />;
}
