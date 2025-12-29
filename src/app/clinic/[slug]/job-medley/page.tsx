interface JobMedleyPageProps {
  params: Promise<{ slug: string }>;
}

export default async function JobMedleyPage({ params }: JobMedleyPageProps) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">ジョブメドレー</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              ジョブメドレー
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">アクセス状況ダッシュボード</p>
          <div className="flex gap-2 mt-3">
            <a href={`/clinic/${slug}/guppy`} className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded hover:bg-gray-300">
              GUPPY
            </a>
            <a href={`/clinic/${slug}/job-medley`} className="px-3 py-1 bg-blue-600 text-white text-sm rounded">
              ジョブメドレー
            </a>
            <a href={`/clinic/${slug}/quacareer`} className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded hover:bg-gray-300">
              Quacareer
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">ジョブメドレーの連携は準備中です</p>
          <p className="text-gray-400 text-sm mt-2">Coming Soon</p>
        </div>
      </main>

      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Powered by 株式会社KOU
        </div>
      </footer>
    </div>
  );
}
