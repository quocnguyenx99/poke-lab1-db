import { Dashboard } from '@/components/Dashboard';
import { getCatalog } from '@/lib/data-source';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const catalog = await getCatalog();

  return <Dashboard initialCatalog={catalog} />;
}
