import FAQ from '@/components/pages/FAQ';

export const metadata = {
  title: 'FAQs',
  description: 'Find answers to frequently asked questions about Delan — sizing, shipping, returns, payments, and more.',
  openGraph: {
    title: 'FAQs | Delan',
    description: 'Find answers to frequently asked questions about Delan — sizing, shipping, returns, payments, and more.',
    type: 'website',
  },
};

export default function Page() {
  return <FAQ />;
}
