import AboutUs from '@/components/pages/AboutUs';

export const metadata = {
  title: 'About Us',
  description: 'Learn about Delan — our story, values, and commitment to premium women\'s fashion crafted for the modern Indian woman.',
  openGraph: {
    title: 'About Us | Delan',
    description: 'Learn about Delan — our story, values, and commitment to premium women\'s fashion crafted for the modern Indian woman.',
    type: 'website',
  },
};

export default function Page() {
  return <AboutUs />;
}
