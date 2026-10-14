import FabricPage from '@/components/pages/FabricPage';

export const metadata = {
  title: 'Fabric Care Guide',
  description: 'Learn how to care for your Delan garments — washing, drying, and storage tips for every fabric.',
  openGraph: {
    title: 'Fabric Care Guide | Delan',
    description: 'Learn how to care for your Delan garments — washing, drying, and storage tips for every fabric.',
    type: 'website',
  },
};

export default function Page() {
  return <FabricPage />;
}
