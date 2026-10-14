import { Suspense } from 'react';
import LoginPage from '@/components/pages/LoginPage';

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your Delan account to track orders, manage addresses, and access your order history.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
