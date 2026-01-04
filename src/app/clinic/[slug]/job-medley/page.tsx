'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';
import { JobMedleyIndicatorCard } from '@/components/ProfileCard';

interface JobMedleyAnalysisData {
  period: string;
  hireCount: number;
  applicationCount: number;
  scoutApplicationCount: number;
  pageViewCount: number;
}

interface JobMedleyScoutData {
  totalSentCount: number;
  dailyData?: { date: string; sent_count: number }[];
}

interface JobMedleyRankData {
  clinicName: string;
  rank: number | null;
  searchUrl: string;
  checkedAt: string;
}

// 新規: 日別データ型（8項目）
interface DailyDataItem {
  date: string;
  scoutSentCount: number;
  scoutApplicationCount: number;
  scoutApplicationRate: number | null;
  searchRank: number | null;
  pageViewCount: number;
  applicationCountJobPage: number;
  jobPageApplicationRate: number | null;
}

// 新規: 求人リスト型
interface JobOffer {
  jobOfferId: string;
  name: string;
}

// 新規: 求人サマリー型（8項目）
interface JobOfferSummary {
  jobOfferId: string;
  name: string;
  hireCount: number;
  applicationCount: number;
  scoutApplicationCount: number;
  pageViewCount: number;
  daysSinceUpdate: number;
  photoCount: number;
  featureTags: string[];
  scoutSentCount: number;
}

// 新規: 重要指標型
interface JobOfferIndicator {
  jobOfferId: string;
  name: string;
  hasSpeedReplyBadge: boolean;
  hasStaffVoice: boolean;
  hasWorkplaceInfo: boolean;
  photoCount: number;
  daysSinceUpdate: number | null;
  featureTags: string[];
  scrapedAt: string | null;
}

interface JobMedleyData {
  // 新規: 日別データ
  dailyData?: DailyDataItem[];
  summary?: JobOfferSummary | null;
  jobOffers?: JobOffer[];
  indicators?: JobOfferIndicator[];
  // 後方互換
  analysis: JobMedleyAnalysisData | null;
  scout: JobMedleyScoutData | null;
  rank: JobMedleyRankData | null;
  scrapedAt: string | null;
}

export default function JobMedleyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isDark, toggleTheme, mounted } = useTheme();

  const [data, setData] = useState<JobMedleyData | null>(null);
  const [clinicName, setClinicName] = useState<string>(slug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [scoutInputs, setScoutInputs] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  // 新規: 求人選択用ステート（null = 全求人合算）
  const [selectedJobOfferId, setSelectedJobOfferId] = useState<string | null>(null);
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);

  const filteredIndicators = data?.indicators
    ? (selectedJobOfferId
        ? data.indicators.filter((indicator) => indicator.jobOfferId === selectedJobOfferId)
        : data.indicators)
    : [];

  useEffect(() => {
    async function fetchClinicName() {
      try {
        const res = await fetch(`/api/clinics/${slug}`);
        if (res.ok) {
          const json = await res.json();
          if (json.clinic?.name) {
            setClinicName(json.clinic.name);
          }
          if (json.clinic?.id) {
            setClinicId(json.clinic.id);
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
        // job_offer_id パラメータを追加
        let url = `/api/jobmedley?year=${selectedYear}&month=${selectedMonth}&slug=${slug}`;
        if (selectedJobOfferId) {
          url += `&job_offer_id=${selectedJobOfferId}`;
        }
        const res = await fetch(url);
        const json = await res.json().catch(() => null);
        if (res.ok) {
          setData(json);
          // 求人リストを更新
          if (json.jobOffers) {
            setJobOffers(json.jobOffers);
          }
        } else {
          setError(json?.error || 'データの取得に失敗しました');
        }
      } catch {
        setError('データの取得中にエラーが発生しました');
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedYear, selectedMonth, slug, selectedJobOfferId]);

  // データ取得後にscoutInputsを初期化
  useEffect(() => {
    if (data?.scout?.dailyData) {
      const inputs: Record<string, number> = {};
      data.scout.dailyData.forEach((d) => {
        inputs[d.date] = d.sent_count;
      });
      setScoutInputs(inputs);
    } else {
      setScoutInputs({});
    }
  }, [data]);

  // 利用可能な月リストを生成（過去12ヶ月）
  const availableMonths: { year: number; month: number; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    availableMonths.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    });
  }

  // 選択月の日付リストを生成
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dateList: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dateList.push(dateStr);
  }

  // スカウト送信数を保存
  const handleSaveScouts = async () => {
    if (!clinicId) {
      setSaveMessage({ type: 'error', text: 'クリニックIDが取得できません' });
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const entries = Object.entries(scoutInputs)
        .filter(([, count]) => count > 0)
        .map(([date, sent_count]) => ({ date, sent_count }));

      const res = await fetch('/api/jobmedley/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinicId, entries }),
      });

      if (res.ok) {
        setSaveMessage({ type: 'success', text: '保存しました' });
      } else {
        const json = await res.json().catch(() => null);
        setSaveMessage({ type: 'error', text: json?.error || '保存に失敗しました' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: '保存中にエラーが発生しました' });
    }
    setSaving(false);
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
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>ジョブメドレー</span>
              </nav>

              <div className="flex items-center gap-3">
                <h1 className={`text-xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>{clinicName}</h1>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded">
                  ジョブメドレー
                </span>
              </div>
              <p className={`text-xs mt-1 tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>アクセス状況ダッシュボード</p>
              <div className="flex gap-2 mt-3">
                <a href={`/clinic/${slug}/guppy`} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  GUPPY
                </a>
                <a href={`/clinic/${slug}/job-medley`} className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg">
                  ジョブメドレー
                </a>
                <a href={`/clinic/${slug}/quacareer`} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  Quacareer
                </a>
              </div>
            </div>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 月選択 */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {availableMonths.map((m) => (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => {
                  setSelectedYear(m.year);
                  setSelectedMonth(m.month);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedYear === m.year && selectedMonth === m.month
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 求人選択ドロップダウン */}
        {jobOffers.length > 0 && (
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              求人（職種）を選択
            </label>
            <select
              value={selectedJobOfferId || ''}
              onChange={(e) => setSelectedJobOfferId(e.target.value || null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-slate-700 text-slate-300 border-slate-600'
                  : 'bg-white text-slate-700 border-slate-300'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">全求人合算</option>
              {jobOffers.map((job) => (
                <option key={job.jobOfferId} value={job.jobOfferId}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
            {/* 求人サマリーカード（求人選択時のみ表示） */}
            {data.summary && (
              <div className="mb-8">
                <JobOfferSummaryCard summary={data.summary} isDark={isDark} />
              </div>
            )}

            {/* 分析データサマリー（求人未選択時または後方互換） */}
            {!data.summary && data.analysis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <SummaryCard
                  title="採用決定数"
                  value={data.analysis.hireCount}
                  color="green"
                  isDark={isDark}
                />
                <SummaryCard
                  title="応募数"
                  value={data.analysis.applicationCount}
                  color="blue"
                  isDark={isDark}
                />
                <SummaryCard
                  title="スカウト経由応募数"
                  value={data.analysis.scoutApplicationCount}
                  color="purple"
                  isDark={isDark}
                />
                <SummaryCard
                  title="求人詳細ページ閲覧数"
                  value={data.analysis.pageViewCount}
                  color="orange"
                  isDark={isDark}
                />
              </div>
            )}

            {/* 求人重要指標 */}
            {filteredIndicators.length > 0 && (
              <div className="mb-8">
                <h2 className={`text-lg font-semibold mb-3 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  求人重要指標
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIndicators.map((indicator) => (
                    <JobMedleyIndicatorCard key={indicator.jobOfferId} {...indicator} />
                  ))}
                </div>
              </div>
            )}

            {/* 日別データテーブル（8項目） */}
            {data.dailyData && data.dailyData.length > 0 && (
              <div className={`rounded-lg shadow mb-8 ${isDark ? "bg-slate-800" : "bg-white"}`}>
                <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <h2 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    日別データ（{selectedYear}年{selectedMonth}月）
                  </h2>
                </div>
                <div className="p-4">
                  <DailyDataTable dailyData={data.dailyData} isDark={isDark} />
                </div>
              </div>
            )}

            {/* スカウトデータ */}
            <div className={`rounded-lg shadow mb-8 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                <h2 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>スカウト送信数（日別入力）</h2>
              </div>
              <div className="p-6">
                {/* サマリー */}
                {data.scout && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className={`rounded-lg p-4 ${isDark ? "bg-indigo-900/30" : "bg-indigo-50"}`}>
                      <p className="text-sm text-indigo-600 opacity-80">スカウト送信数（月計）</p>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{data.scout.totalSentCount.toLocaleString()}</p>
                    </div>
                    {data.analysis && data.scout.totalSentCount > 0 && (
                      <div className={`rounded-lg p-4 ${isDark ? "bg-teal-900/30" : "bg-teal-50"}`}>
                        <p className="text-sm text-teal-600 opacity-80">スカウト応募率</p>
                        <p className="text-2xl font-bold text-teal-600 mt-1">
                          {((data.analysis.scoutApplicationCount / data.scout.totalSentCount) * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 日別入力フォーム */}
                <div className={`border rounded-lg p-4 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      {selectedYear}年{selectedMonth}月の日別入力
                    </h3>
                    <div className="flex items-center gap-3">
                      {saveMessage && (
                        <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                          {saveMessage.text}
                        </span>
                      )}
                      <button
                        onClick={handleSaveScouts}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          saving
                            ? 'bg-slate-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {saving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {dateList.map((dateStr) => {
                      const day = parseInt(dateStr.split('-')[2], 10);
                      const dayOfWeek = new Date(dateStr).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      return (
                        <div key={dateStr} className="flex flex-col items-center">
                          <label
                            className={`text-xs mb-1 ${
                              isWeekend
                                ? dayOfWeek === 0 ? 'text-red-500' : 'text-blue-500'
                                : isDark ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            {day}日
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={scoutInputs[dateStr] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              setScoutInputs((prev) => ({ ...prev, [dateStr]: val }));
                            }}
                            className={`w-full px-2 py-1 text-center text-sm rounded border ${
                              isDark
                                ? 'bg-slate-700 border-slate-600 text-slate-100'
                                : 'bg-white border-slate-300 text-slate-800'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className={`mt-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    入力合計: {Object.values(scoutInputs).reduce((sum, v) => sum + (v || 0), 0)}件
                  </p>
                </div>
              </div>
            </div>

            {/* 検索順位 */}
            {data.rank && (
              <div className={`rounded-lg shadow mb-8 ${isDark ? "bg-slate-800" : "bg-white"}`}>
                <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <h2 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>検索順位</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-6">
                    <div className={`rounded-lg p-6 ${isDark ? "bg-amber-900/30" : "bg-amber-50"}`}>
                      <p className="text-sm text-amber-600 opacity-80">現在の順位</p>
                      <p className="text-4xl font-bold text-amber-600 mt-1">
                        {data.rank.rank !== null ? `${data.rank.rank}位` : '圏外'}
                      </p>
                    </div>
                    <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      <p>クリニック名: {data.rank.clinicName}</p>
                      <p className="mt-1">確認日時: {new Date(data.rank.checkedAt).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 重要指標セクション */}
            {data.indicators && data.indicators.length > 0 && (
              <div className={`rounded-lg shadow mb-8 ${isDark ? "bg-slate-800" : "bg-white"}`}>
                <div className={`px-6 py-4 border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <h2 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    重要指標（検索順位向上のためのチェックポイント）
                  </h2>
                  <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    これらの項目を改善することで検索順位が向上します
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.indicators.map((indicator) => (
                      <JobMedleyIndicatorCard
                        key={indicator.jobOfferId}
                        jobOfferId={indicator.jobOfferId}
                        name={indicator.name}
                        hasSpeedReplyBadge={indicator.hasSpeedReplyBadge}
                        hasStaffVoice={indicator.hasStaffVoice}
                        hasWorkplaceInfo={indicator.hasWorkplaceInfo}
                        photoCount={indicator.photoCount}
                        daysSinceUpdate={indicator.daysSinceUpdate}
                        featureTags={indicator.featureTags}
                        scrapedAt={indicator.scrapedAt}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 取得日時 */}
            <div className={`text-xs text-right ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              最終取得: {data.scrapedAt ? new Date(data.scrapedAt).toLocaleString('ja-JP') : '未取得'}
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
  color,
  isDark,
}: {
  title: string;
  value: number;
  color: string;
  isDark: boolean;
}) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    green: { bg: isDark ? 'bg-green-900/30' : 'bg-green-50', text: 'text-green-600' },
    blue: { bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50', text: 'text-blue-600' },
    purple: { bg: isDark ? 'bg-purple-900/30' : 'bg-purple-50', text: 'text-purple-600' },
    orange: { bg: isDark ? 'bg-orange-900/30' : 'bg-orange-50', text: 'text-orange-600' },
  };

  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`rounded-lg p-4 ${classes.bg}`}>
      <p className={`text-sm opacity-80 ${classes.text}`}>{title}</p>
      <p className={`text-2xl font-bold mt-1 ${classes.text}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// 日別データテーブルコンポーネント（8項目×31行）
function DailyDataTable({
  dailyData,
  isDark,
}: {
  dailyData: DailyDataItem[];
  isDark: boolean;
}) {
  // 率を表示用にフォーマット（ゼロ除算時は「—」）
  const formatRate = (rate: number | null): string => {
    if (rate === null) return '—';
    return `${(rate * 100).toFixed(1)}%`;
  };

  // 検索順位を表示用にフォーマット
  const formatRank = (rank: number | null): string => {
    if (rank === null) return '—';
    return `${rank}位`;
  };

  const headerClass = `px-3 py-2 text-xs font-medium text-left ${
    isDark ? 'text-slate-400 bg-slate-700/50' : 'text-slate-600 bg-slate-100'
  }`;
  const cellClass = `px-3 py-2 text-sm ${
    isDark ? 'text-slate-300' : 'text-slate-700'
  }`;
  const borderClass = isDark ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse border ${borderClass}`}>
        <thead>
          <tr>
            <th className={`${headerClass} border ${borderClass}`}>日付</th>
            <th className={`${headerClass} border ${borderClass}`}>送信数</th>
            <th className={`${headerClass} border ${borderClass}`}>スカウト経由応募</th>
            <th className={`${headerClass} border ${borderClass}`}>スカウト応募率</th>
            <th className={`${headerClass} border ${borderClass}`}>検索順位</th>
            <th className={`${headerClass} border ${borderClass}`}>閲覧数</th>
            <th className={`${headerClass} border ${borderClass}`}>求人ページ経由応募</th>
            <th className={`${headerClass} border ${borderClass}`}>求人ページ応募率</th>
          </tr>
        </thead>
        <tbody>
          {dailyData.length === 0 ? (
            <tr>
              <td colSpan={8} className={`${cellClass} text-center py-8`}>
                データがありません
              </td>
            </tr>
          ) : (
            dailyData.map((row) => {
              const date = new Date(row.date);
              const dayOfWeek = date.getDay();
              const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
              const dateDisplay = `${date.getMonth() + 1}/${date.getDate()}(${dayNames[dayOfWeek]})`;
              const rowBg = dayOfWeek === 0
                ? isDark ? 'bg-red-900/10' : 'bg-red-50/50'
                : dayOfWeek === 6
                  ? isDark ? 'bg-blue-900/10' : 'bg-blue-50/50'
                  : '';

              return (
                <tr key={row.date} className={rowBg}>
                  <td className={`${cellClass} border ${borderClass} font-medium`}>{dateDisplay}</td>
                  <td className={`${cellClass} border ${borderClass} text-right`}>{row.scoutSentCount}</td>
                  <td className={`${cellClass} border ${borderClass} text-right`}>{row.scoutApplicationCount}</td>
                  <td className={`${cellClass} border ${borderClass} text-right`}>{formatRate(row.scoutApplicationRate)}</td>
                  <td className={`${cellClass} border ${borderClass} text-right`}>{formatRank(row.searchRank)}</td>
                  <td className={`${cellClass} border ${borderClass} text-right`}>{row.pageViewCount}</td>
                  <td className={`${cellClass} border ${borderClass} text-right`}>{row.applicationCountJobPage}</td>
                  <td className={`${cellClass} border ${borderClass} text-right`}>{formatRate(row.jobPageApplicationRate)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// 求人サマリーカードコンポーネント（8項目）
function JobOfferSummaryCard({
  summary,
  isDark,
}: {
  summary: JobOfferSummary;
  isDark: boolean;
}) {
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';
  const labelColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const valueColor = isDark ? 'text-slate-100' : 'text-slate-800';

  const items = [
    { label: '採用決定数', value: summary.hireCount, color: 'text-green-600' },
    { label: '応募数', value: summary.applicationCount, color: 'text-blue-600' },
    { label: 'スカウト経由応募数', value: summary.scoutApplicationCount, color: 'text-purple-600' },
    { label: '閲覧数', value: summary.pageViewCount, color: 'text-orange-600' },
    { label: '原稿更新からの日数', value: `${summary.daysSinceUpdate}日`, color: 'text-slate-600' },
    { label: '写真枚数', value: `${summary.photoCount}枚`, color: 'text-slate-600' },
    { label: 'スカウト送信数', value: summary.scoutSentCount, color: 'text-indigo-600' },
  ];

  return (
    <div className={`rounded-lg shadow ${cardBg} border ${borderColor}`}>
      <div className={`px-6 py-4 border-b ${borderColor}`}>
        <h3 className={`text-lg font-semibold ${valueColor}`}>{summary.name}</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {items.map((item, idx) => (
            <div key={idx} className={`rounded-lg p-3 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <p className={`text-xs ${labelColor}`}>{item.label}</p>
              <p className={`text-lg font-bold mt-1 ${item.color}`}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </p>
            </div>
          ))}
        </div>
        {summary.featureTags.length > 0 && (
          <div>
            <p className={`text-xs ${labelColor} mb-2`}>特徴タグ</p>
            <div className="flex flex-wrap gap-2">
              {summary.featureTags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 text-xs rounded ${
                    isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
