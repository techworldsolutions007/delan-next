import { Suspense } from 'react';
import CollectionPage from '@/components/pages/Collection';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

export const metadata = {
  title: 'Search Women\'s Fashion | Delan — Find Dresses, Co-ords & More',
  description: 'Search Delan\'s full collection of premium women\'s fashion — dresses, co-ord sets, ethnic wear, and more. Find your perfect style.',
  alternates: { canonical: `${SITE_URL}/search` },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Search Women\'s Fashion | Delan',
    description: 'Search Delan\'s full collection of premium women\'s fashion.',
    type: 'website',
    url: `${SITE_URL}/search`,
  },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CollectionPage />
    </Suspense>
  );
}
