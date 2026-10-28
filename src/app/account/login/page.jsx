import { Suspense } from 'react';
import LoginPage from '@/components/pages/LoginPage';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

export const metadata = {
  title: 'Sign In to Your Account | Delan',
  description: 'Sign in to your Delan account to track orders, manage addresses, and access your order history.',
  alternates: { canonical: `${SITE_URL}/account/login` },
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
