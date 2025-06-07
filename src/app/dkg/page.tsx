import KnowledgeGraphExplorer from '@/app/components/KnowledgeGraphExplorer';

export const metadata = {
  title: 'Knowledge Graph Explorer',
};

export default function DkgPage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Knowledge Graph Explorer</h1>
      <KnowledgeGraphExplorer />
    </main>
  );
} 