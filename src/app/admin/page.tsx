'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';

interface AdminClinicSummary {
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

export default function AdminPage() {
  const { isDark, toggleTheme, mounted } = useTheme();

  const [clinics, setClinics] = useState<AdminClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // 認証チェック（一時的に無効化）
  useEffect(() => {
    // 認証無効化中は常に管理者として扱う
    setIsAdmin(true);
  }, []);

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
    if (!isAdmin) return;
    fetchClinics();
  }, [isAdmin, fetchClinics]);

  // ログアウト処理（認証無効化中は何もしない）
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  // 手動スクレイピング
  const handleManualScrape = async () => {
    if (!confirm('全クライアントのデータを取得しますか？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      alert(`スクレイピング完了: ${data.results?.length || 0}件処理`);
      // データ再取得
      fetchClinics();
    } catch {
      alert('スクレイピング中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isAdmin) {
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
              管理ダッシュボード
            </h1>
            <p
              className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              全クリニック一覧
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <Link
              href="/admin/passwords"
              className={`px-4 py-2 text-sm rounded-lg transition ${
                isDark
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              パスワード管理
            </Link>
            <button
              onClick={handleManualScrape}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? '処理中...' : 'データ取得'}
            </button>
            <button
              onClick={handleLogout}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                isDark
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ログアウト
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

        {/* クリニック一覧テーブル */}
        {loading ? (
          <div className="text-center py-8">
            <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>
              読み込み中...
            </p>
          </div>
        ) : (
          <div
            className={`rounded-lg shadow overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          >
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className={isDark ? 'bg-slate-700' : 'bg-slate-50'}>
                <tr>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    クリニック名
                  </th>
                  <th
                    className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    応募数
                  </th>
                  <th
                    className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    閲覧数
                  </th>
                  <th
                    className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    目標進捗
                  </th>
                  <th
                    className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    パスワード
                  </th>
                  <th
                    className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}
              >
                {clinics.map((clinic) => (
                  <tr
                    key={clinic.id}
                    className={isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}
                  >
                    <td
                      className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
                    >
                      <div className="text-sm font-medium">{clinic.name}</div>
                      <div
                        className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                      >
                        {clinic.slug}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
                    >
                      <span
                        className={
                          clinic.metrics.totalApplicationCount > 0
                            ? 'text-emerald-500 font-semibold'
                            : ''
                        }
                      >
                        {clinic.metrics.totalApplicationCount}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
                    >
                      {clinic.metrics.totalViewCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {clinic.goalProgress ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
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
                          <span
                            className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                          >
                            {clinic.goalProgress.progressRate}%
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                        >
                          未設定
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {clinic.hasPassword ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          設定済み
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          未設定
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/clinic/${clinic.slug}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          詳細
                        </Link>
                        <Link
                          href={`/clinic/${clinic.slug}/settings`}
                          className="text-slate-600 dark:text-slate-400 hover:underline text-sm"
                        >
                          設定
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && clinics.length === 0 && (
          <div
            className={`rounded-lg p-8 text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}
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
