import Home from '@/components/pages/Home';

export const metadata = {
  title: 'Premium Women\'s Fashion — Co-ord Sets, Ethnic & Contemporary Styles',
  description: 'Shop Delan\'s premium women\'s fashion — co-ord sets, ethnic wear, dresses, and contemporary styles crafted for the modern Indian woman. Free shipping available.',
  openGraph: {
    title: 'Delan — Premium Women\'s Fashion',
    description: 'Shop Delan\'s premium women\'s fashion — co-ord sets, ethnic wear, dresses, and contemporary styles crafted for the modern Indian woman.',
    type: 'website',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Delan Fashion' }],
  },
};

export default function Page() {
  return <Home />;
}
