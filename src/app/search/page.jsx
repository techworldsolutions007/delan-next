import { Suspense } from 'react';
import CollectionPage from '@/components/pages/Collection';

export const metadata = {
  title: 'Search',
  description: 'Search Delan\'s full collection of premium women\'s fashion — dresses, co-ord sets, ethnic wear, and more.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Search | Delan',
    description: 'Search Delan\'s full collection of premium women\'s fashion.',
    type: 'website',
  },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CollectionPage />
    </Suspense>
  );
}
