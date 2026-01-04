'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';

interface ClinicSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  metrics: {
    totalApplicationCount: number;
    totalViewCount: number;
    totalDisplayCount: number;
    totalRedirectCount: number;
  };
  goalProgress: {
    totalTargetCount: number;
    totalCurrentCount: number;
    progressRate: number;
    isOnTrack: boolean;
  } | null;
  hasPassword: boolean;
  latestDataDate: string | null;
}

export default function ClinicListPage() {
  const { isDark, toggleTheme, mounted } = useTheme();

  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // データ取得
  const fetchClinics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedMonth) params.set('month', selectedMonth);

      const res = await fetch(`/api/admin/clinics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
      }
    } catch (error) {
      console.error('Failed to fetch clinics:', error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedMonth]);

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  // 手動スクレイピング
  const handleManualScrape = async () => {
    if (!confirm('全クライアントのデータを取得しますか？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      alert(`スクレイピング完了: ${data.results?.length || 0}件処理`);
      fetchClinics();
    } catch {
      alert('スクレイピング中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* ヘッダー */}
      <header
        className={`border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1
              className={`text-xl font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
            >
              Clinic Dashboard
            </h1>
            <p
              className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              採用メディア管理
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <button
              onClick={handleManualScrape}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? '処理中...' : 'データ取得'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* フィルター */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="クリニック名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`px-4 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500'
                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
            }`}
          />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`px-4 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          />
        </div>

        {/* クリニック一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse space-y-4 w-full max-w-md">
              <div className={`h-4 rounded w-3/4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <div className={`h-4 rounded w-1/2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <div className={`h-4 rounded w-2/3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className={`rounded-xl p-5 border transition-all ${
                  isDark
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* クリニック名 */}
                <div className="mb-4">
                  <h2
                    className={`text-base font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                  >
                    {clinic.name}
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {clinic.slug}
                  </p>
                </div>

                {/* メトリクス */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p
                      className={`text-xs font-medium uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                    >
                      応募数
                    </p>
                    <p
                      className={`text-2xl font-semibold ${
                        clinic.metrics.totalApplicationCount > 0
                          ? 'text-emerald-500'
                          : isDark
                            ? 'text-slate-100'
                            : 'text-slate-800'
                      }`}
                    >
                      {clinic.metrics.totalApplicationCount}
                    </p>
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                    >
                      閲覧数
                    </p>
                    <p
                      className={`text-2xl font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                    >
                      {clinic.metrics.totalViewCount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 目標進捗 */}
                {clinic.goalProgress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                      >
                        目標進捗
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          clinic.goalProgress.isOnTrack
                            ? 'text-emerald-500'
                            : 'text-amber-500'
                        }`}
                      >
                        {clinic.goalProgress.progressRate}%
                      </p>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          clinic.goalProgress.isOnTrack
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                        style={{
                          width: `${Math.min(clinic.goalProgress.progressRate, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* リンク */}
                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <Link
                    href={`/clinic/${clinic.slug}/guppy`}
                    className={`flex-1 text-center py-2 text-xs rounded-lg transition ${
                      isDark
                        ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    GUPPY
                  </Link>
                  <Link
                    href={`/clinic/${clinic.slug}/job-medley`}
                    className={`flex-1 text-center py-2 text-xs rounded-lg transition ${
                      isDark
                        ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ジョブメドレー
                  </Link>
                  <Link
                    href={`/clinic/${clinic.slug}/quacareer`}
                    className={`flex-1 text-center py-2 text-xs rounded-lg transition ${
                      isDark
                        ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    クオキャリア
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && clinics.length === 0 && (
          <div
            className={`rounded-xl p-12 border text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
          >
            <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>
              クリニックが見つかりません
            </p>
          </div>
        )}
      </main>

      <footer
        className={`border-t mt-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      >
        <div
          className={`max-w-7xl mx-auto px-4 py-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
        >
          Powered by 株式会社KOU
        </div>
      </footer>
    </div>
  );
}
