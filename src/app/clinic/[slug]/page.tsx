import { getSupabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { GoalProgressList, GoalSummary } from '@/components/GoalProgressCard';
import { getGoalsWithProgress } from '@/lib/goals';

interface ClinicPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClinicPage({ params }: ClinicPageProps) {
  const { slug } = await params;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return <div>Database not configured</div>;
  }

  // クリニック情報を取得
  const { data: clinic, error } = await supabase
    .from('clinics')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (error || !clinic) {
    notFound();
  }

  // 目標進捗を取得
  const goals = await getGoalsWithProgress(supabase, clinic.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{clinic.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">採用ダッシュボード</p>
          </div>
          <Link
            href={`/clinic/${slug}/settings`}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            設定
          </Link>
        </div>

        {/* 目標サマリー */}
        {goals.length > 0 && <GoalSummary goals={goals} />}

        {/* 目標進捗カード */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">採用目標</h2>
          <GoalProgressList goals={goals} showDetails />
        </div>

        {/* 媒体別ダッシュボードへのリンク */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/clinic/${slug}/guppy`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">GUPPY</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              閲覧データ・スカウトメール・Bitly連携
            </p>
          </Link>

          <Link
            href={`/clinic/${slug}/job-medley`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">ジョブメドレー</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              検索順位・分析データ・スカウト送信数
            </p>
          </Link>

          <Link
            href={`/clinic/${slug}/quacareer`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">クオキャリア</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              スカウトメール開封率・応募者数
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
