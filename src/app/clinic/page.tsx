interface Clinic {
  id: string;
  name: string;
  slug: string;
  latestDate: string | null;
  summary: {
    totalDisplayCount: number;
    totalViewCount: number;
    totalRedirectCount: number;
    totalApplicationCount: number;
  };
}

async function getClinics(): Promise<Clinic[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/clinics`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.clinics || [];
}

export default async function ClinicListPage() {
  const clinics = await getClinics();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">クリニック一覧</h1>
          <p className="text-sm text-gray-500 mt-1">採用メディアダッシュボード</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clinics.map((clinic) => (
            <a
              key={clinic.id}
              href={`/clinic/${clinic.slug}/guppy`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{clinic.name}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">応募数:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    {clinic.summary.totalApplicationCount}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">閲覧数:</span>
                  <span className="ml-2 font-medium">{clinic.summary.totalViewCount}</span>
                </div>
              </div>
              {clinic.latestDate && (
                <p className="text-xs text-gray-400 mt-3">最終更新: {clinic.latestDate}</p>
              )}
            </a>
          ))}
        </div>

        {clinics.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            クリニックが登録されていません
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Powered by 株式会社KOU
        </div>
      </footer>
    </div>
  );
}
