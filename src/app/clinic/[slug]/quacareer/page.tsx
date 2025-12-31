'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';

interface QuacareerDashboardData {
  totalApplicants: number;
  favoritesDH: number;
  favoritesDR: number;
  scoutMailOpenRate: number;
  scoutPlusOpenRate: number;
}

interface QuacareerScoutMail {
  deliveryDate: string;
  targetJobType: string;
  message: string;
  deliveryCount: number;
  openRate: number;
}

interface QuacareerData {
  dashboard: QuacareerDashboardData | null;
  scoutMails: QuacareerScoutMail[];
  scrapedAt: string | null;
}

// 職種タイプ
type JobTypeFilter = 'all' | '歯科衛生士' | '歯科医師';

export default function QuacareerPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isDark, toggleTheme, mounted } = useTheme();

  const [data, setData] = useState<QuacareerData | null>(null);
  const [clinicName, setClinicName] = useState<string>(slug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobType, setSelectedJobType] = useState<JobTypeFilter>('all');

  useEffect(() => {
    async function fetchClinicName() {
      try {
        const res = await fetch(`/api/clinics/${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (json.clinic?.name) {
            setClinicName(json.clinic.name);
          }
        }
      } catch {
        // クリニック名取得失敗時はslugを使用
      }
    }
    fetchClinicName();
  }, [slug]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/quacareer?slug=${slug}`);
        const json = await res.json().catch(() => null);
        if (res.ok) {
          setData(json);
        } else {
          setError(json?.error || 'データの取得に失敗しました');
        }
      } catch {
        setError('データの取得中にエラーが発生しました');
      }
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  // 職種でフィルタリングしたスカウトメール
  const filteredScoutMails = data?.scoutMails.filter((mail) => {
    if (selectedJobType === 'all') return true;
    return mail.targetJobType.includes(selectedJobType);
  }) || [];

  // 職種別サマリー計算
  const getJobTypeSummary = (jobType: JobTypeFilter) => {
    const mails = jobType === 'all'
      ? (data?.scoutMails || [])
      : (data?.scoutMails || []).filter((m) => m.targetJobType.includes(jobType));

    const totalDelivery = mails.reduce((sum, m) => sum + m.deliveryCount, 0);
    const avgOpenRate = mails.length > 0
      ? mails.reduce((sum, m) => sum + m.openRate, 0) / mails.length
      : 0;

    return { count: mails.length, totalDelivery, avgOpenRate };
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-3 w-16 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      <header className={`border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <nav className={`flex items-center gap-2 text-xs mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                <a href="/clinic" className={`hover:underline ${isDark ? "hover:text-slate-300" : "hover:text-slate-600"}`}>クリニック一覧</a>
                <span>/</span>
                <a href={`/clinic/${slug}`} className={`hover:underline ${isDark ? "hover:text-slate-300" : "hover:text-slate-600"}`}>{clinicName}</a>
                <span>/</span>
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>Quacareer</span>
              </nav>

              <div className="flex items-center gap-3">
                <h1 className={`text-xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>{clinicName}</h1>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-xs font-medium rounded">
                  Quacareer
                </span>
              </div>
              <p className={`text-xs mt-1 tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>アクセス状況ダッシュボード</p>
              <div className="flex gap-2 mt-3">
                <a href={`/clinic/${slug}/guppy`} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  GUPPY
                </a>
                <a href={`/clinic/${slug}/job-medley`} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  ジョブメドレー
                </a>
                <a href={`/clinic/${slug}/quacareer`} className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-lg">
                  Quacareer
                </a>
              </div>
            </div>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className={`rounded-lg shadow p-8 text-center ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className="animate-pulse space-y-4">
              <div className={`h-4 w-48 mx-auto rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-4 w-32 mx-auto rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            </div>
            <p className={`mt-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>データを取得中...</p>
          </div>
        ) : error ? (
          <div className={`rounded-lg shadow p-8 text-center ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <p className="text-red-500">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* ダッシュボードサマリー */}
            {data.dashboard && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <SummaryCard
                  title="累計応募者数"
                  value={data.dashboard.totalApplicants}
                  unit="名"
                  color="purple"
                  isDark={isDark}
                />
                <SummaryCard
                  title="お気に入り（歯科衛生士）"
                  value={data.dashboard.favoritesDH}
                  unit="名"
                  color="pink"
                  isDark={isDark}
                />
                <SummaryCard
                  title="お気に入り（歯科医師）"
                  value={data.dashboard.favoritesDR}
                  unit="名"
                  color="blue"
                  isDark={isDark}
                />
                <SummaryCard
                  title="スカウトメール開封率"
                  value={data.dashboard.scoutMailOpenRate}
                  unit="%"
                  color="green"
                  isDark={isDark}
                />
                <SummaryCard
                  title="スカウトプラス開封率"
                  value={data.dashboard.scoutPlusOpenRate}
                  unit="%"
                  color="orange"
                  isDark={isDark}
                />
              </div>
            )}

            {/* 職種タブ */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {(['all', '歯科衛生士', '歯科医師'] as JobTypeFilter[]).map((jobType) => {
                  const summary = getJobTypeSummary(jobType);
                  const label = jobType === 'all' ? '全て' : jobType;
                  return (
                    <button
                      key={jobType}
                      onClick={() => setSelectedJobType(jobType)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        selectedJobType === jobType
                          ? jobType === '歯科衛生士'
                            ? 'bg-pink-600 text-white'
                            : jobType === '歯科医師'
                              ? 'bg-blue-600 text-white'
                              : 'bg-purple-600 text-white'
                          : isDark
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        selectedJobType === jobType
                          ? 'bg-white/20'
                          : isDark ? 'bg-slate-600' : 'bg-slate-100'
                      }`}>
                        {summary.count}件
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 選択中の職種サマリー */}
              {selectedJobType !== 'all' && (
                <div className={`mt-4 p-4 rounded-lg ${
                  selectedJobType === '歯科衛生士'
                    ? isDark ? 'bg-pink-900/30' : 'bg-pink-50'
                    : isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                }`}>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className={`text-xs ${selectedJobType === '歯科衛生士' ? 'text-pink-600' : 'text-blue-600'}`}>配信回数</p>
                      <p className={`text-xl font-bold ${selectedJobType === '歯科衛生士' ? 'text-pink-700' : 'text-blue-700'}`}>
                        {getJobTypeSummary(selectedJobType).count}回
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${selectedJobType === '歯科衛生士' ? 'text-pink-600' : 'text-blue-600'}`}>総配信数</p>
                      <p className={`text-xl font-bold ${selectedJobType === '歯科衛生士' ? 'text-pink-700' : 'text-blue-700'}`}>
                        {getJobTypeSummary(selectedJobType).totalDelivery.toLocaleString()}件
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${selectedJobType === '歯科衛生士' ? 'text-pink-600' : 'text-blue-600'}`}>平均開封率</p>
                      <p className={`text-xl font-bold ${selectedJobType === '歯科衛生士' ? 'text-pink-700' : 'text-blue-700'}`}>
                        {getJobTypeSummary(selectedJobType).avgOpenRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* スカウトメール一覧 */}
            <div className={`rounded-lg shadow overflow-hidden ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <h2 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  スカウトメール一覧
                  {selectedJobType !== 'all' && (
                    <span className={`ml-2 text-sm font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      （{selectedJobType}）
                    </span>
                  )}
                </h2>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  最終取得: {data.scrapedAt ? new Date(data.scrapedAt).toLocaleString('ja-JP') : '未取得'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className={isDark ? "bg-slate-700" : "bg-slate-50"}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>配信日時</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>対象職種</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>メッセージ</th>
                      <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>配信件数</th>
                      <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>開封率</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-slate-700" : "divide-slate-200"}`}>
                    {filteredScoutMails.length > 0 ? (
                      filteredScoutMails.map((mail, index) => (
                        <tr key={index} className={isDark ? "hover:bg-slate-700" : "hover:bg-slate-50"}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? "text-slate-300" : "text-slate-900"}`}>
                            {mail.deliveryDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              mail.targetJobType.includes('衛生士')
                                ? 'bg-pink-100 text-pink-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {mail.targetJobType}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-sm max-w-xs truncate ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                            {mail.message}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${isDark ? "text-slate-300" : "text-slate-900"}`}>
                            {mail.deliveryCount.toLocaleString()}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                            mail.openRate >= 70 ? 'text-green-600' :
                            mail.openRate >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {mail.openRate}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={`px-6 py-8 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>

      <footer className={`border-t mt-8 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className={`max-w-7xl mx-auto px-4 py-4 text-center text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          Powered by 株式会社KOU
        </div>
      </footer>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  unit,
  color,
  isDark,
}: {
  title: string;
  value: number;
  unit: string;
  color: string;
  isDark: boolean;
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    purple: { bg: isDark ? 'bg-purple-900/30' : 'bg-purple-50', text: 'text-purple-600' },
    pink: { bg: isDark ? 'bg-pink-900/30' : 'bg-pink-50', text: 'text-pink-600' },
    blue: { bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: isDark ? 'bg-green-900/30' : 'bg-green-50', text: 'text-green-600' },
    orange: { bg: isDark ? 'bg-orange-900/30' : 'bg-orange-50', text: 'text-orange-600' },
  };

  const classes = colorClasses[color] || colorClasses.purple;

  return (
    <div className={`rounded-lg p-4 ${classes.bg}`}>
      <p className={`text-sm opacity-80 ${classes.text}`}>{title}</p>
      <p className={`text-2xl font-bold mt-1 ${classes.text}`}>
        {value.toLocaleString()}{unit}
      </p>
    </div>
  );
}
