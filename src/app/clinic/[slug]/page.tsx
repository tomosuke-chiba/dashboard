import MetricsCard from '@/components/MetricsCard';
import MetricsChart from '@/components/MetricsChart';

interface ClinicPageProps {
  params: Promise<{ slug: string }>;
}

async function getClinicData(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/clinics/${slug}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export default async function ClinicPage({ params }: ClinicPageProps) {
  const { slug } = await params;
  const data = await getClinicData(slug);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">クライアントが見つかりません</h1>
          <p className="text-gray-600 mt-2">指定されたURLのクライアントは存在しません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">{data.clinic.name}</h1>
          <p className="text-sm text-gray-500 mt-1">求人媒体パフォーマンスダッシュボード</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricsCard
            title="閲覧数（PV）"
            value={data.currentMetrics?.pv_count || 0}
            icon="pv"
            lastUpdated={data.currentMetrics?.recorded_at}
          />
          <MetricsCard
            title="応募数"
            value={data.currentMetrics?.application_count || 0}
            icon="application"
            lastUpdated={data.currentMetrics?.recorded_at}
          />
        </div>

        {data.history && data.history.length > 0 ? (
          <MetricsChart data={data.history} />
        ) : (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-500">まだ履歴データがありません</p>
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Powered by 株式会社KOU
        </div>
      </footer>
    </div>
  );
}
