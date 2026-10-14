import Contact from '@/components/pages/Contact';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Delan — we\'re here to help with orders, styling advice, and any questions about our collections.',
  openGraph: {
    title: 'Contact Us | Delan',
    description: 'Get in touch with Delan — we\'re here to help with orders, styling advice, and any questions about our collections.',
    type: 'website',
  },
};

export default function Page() {
  return <Contact />;
}
