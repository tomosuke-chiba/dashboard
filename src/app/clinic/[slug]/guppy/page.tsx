'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DailyMetrics, ScoutMessage, BitlyClick, JobType, JOB_TYPE_LABELS, PHASE1_JOB_TYPES } from '@/types';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';
import { KPISummary, AlertList, SolutionTable } from '@/components/KPICard';
import { GuppyProfileCard } from '@/components/ProfileCard';
import {
  GUPPY_VIEW_KPIS,
  GUPPY_SCOUT_KPIS,
  GUPPY_VIEW_SOLUTIONS,
  GUPPY_SCOUT_SOLUTIONS,
  createKPIAlert,
  calculateViewRate as calcViewRate,
  calculateApplicationRate,
  calculateRedirectRate,
  calculateReplyRate,
  calculateBitlyClickRate,
  KPIAlert,
} from '@/lib/kpi';

interface BitlyLinkClick {
  bitly_link_id: string;
  source: string;
  link_id: string;
  label: string | null;
  total_clicks: number;
}

interface ClinicData {
  clinic: {
    id: string;
    name: string;
    slug: string;
    guppy_profile_completeness?: number | null;
    guppy_independence_support?: boolean | null;
    guppy_profile_updated_at?: string | null;
    guppy_profile_scraped_at?: string | null;
  };
  metrics: DailyMetrics[];
  summary: {
    totalDisplayCount: number;
    totalViewCount: number;
    totalRedirectCount: number;
    totalApplicationCount: number;
    viewRate: number;
    applicationRate: number;
  };
  scoutMessages?: ScoutMessage[];
  bitlyClicks?: BitlyClick[];
  bitlyLinkClicks?: BitlyLinkClick[];
  availableMonths: string[];
  currentMonth: string | null;
}

type TabType = 'all' | JobType;

export default function GuppyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isDark, toggleTheme, mounted } = useTheme();

  const [data, setData] = useState<ClinicData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMonth) params.set('month', selectedMonth);
      if (selectedTab !== 'all') params.set('job_type', selectedTab);

      const queryString = params.toString();
      const res = await fetch(`/api/clinics/${slug}${queryString ? `?${queryString}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!selectedMonth && json.currentMonth) {
          setSelectedMonth(json.currentMonth);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [slug, selectedMonth, selectedTab]);

  if (!mounted || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded"></div>
          <div className="h-3 w-16 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="text-center">
          <h1 className={`text-xl font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>クライアントが見つかりません</h1>
        </div>
      </div>
    );
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // 閲覧率の計算とアラート判定
  const calculateViewRate = (displayCount: number, viewCount: number) => {
    if (displayCount === 0) return 0;
    return viewCount / displayCount;
  };

  const isViewRateAlert = (displayCount: number, viewCount: number) => {
    return calculateViewRate(displayCount, viewCount) > 0.3;
  };

  // スカウトメールのサマリー計算
  const scoutSummary = data.scoutMessages?.reduce(
    (acc, msg) => ({
      sent: acc.sent + msg.sent_count,
      reply: acc.reply + msg.reply_count,
    }),
    { sent: 0, reply: 0 }
  ) || { sent: 0, reply: 0 };

  const scoutReplyRate = scoutSummary.sent > 0
    ? ((scoutSummary.reply / scoutSummary.sent) * 100).toFixed(1)
    : '0.0';

  // Bitlyクリック数のサマリーとクリック率
  const totalBitlyClicks = data.bitlyClicks?.reduce(
    (sum, click) => sum + click.click_count, 0
  ) || 0;

  const bitlyClickRate = scoutSummary.sent > 0
    ? ((totalBitlyClicks / scoutSummary.sent) * 100).toFixed(1)
    : '0.0';

  // 職種別フィルタリング（将来の拡張用）
  const filteredMetrics = selectedTab === 'all'
    ? data.metrics
    : data.metrics.filter(m => m.job_type === selectedTab);

  // KPIアラート計算
  const viewRateValue = calcViewRate(data.summary.totalViewCount, data.summary.totalDisplayCount);
  const applicationRateValue = calculateApplicationRate(data.summary.totalApplicationCount, data.summary.totalViewCount);
  const redirectRateValue = calculateRedirectRate(data.summary.totalRedirectCount, data.summary.totalViewCount);
  const replyRateValue = calculateReplyRate(scoutSummary.reply, scoutSummary.sent);
  const bitlyClickRateValue = calculateBitlyClickRate(totalBitlyClicks, scoutSummary.sent);

  // KPIアラートを生成
  const viewKPIs = [
    { ...createKPIAlert(viewRateValue, GUPPY_VIEW_KPIS.viewRate, 'guppy', 'view'), title: '閲覧率' },
    { ...createKPIAlert(applicationRateValue, GUPPY_VIEW_KPIS.applicationRate, 'guppy', 'view'), title: '応募率' },
    { ...createKPIAlert(redirectRateValue, GUPPY_VIEW_KPIS.redirectRate, 'guppy', 'view'), title: '自社サイト誘導率' },
  ];

  const scoutKPIs = [
    { ...createKPIAlert(bitlyClickRateValue, GUPPY_SCOUT_KPIS.bitlyClickRate, 'guppy', 'scout'), title: 'Bitlyクリック率' },
    { ...createKPIAlert(replyRateValue, GUPPY_SCOUT_KPIS.scoutReplyRate, 'guppy', 'scout'), title: 'スカウト返信率' },
  ];

  // 不正検知チェック
  const fraudAlert = viewRateValue > 30
    ? createKPIAlert(viewRateValue, GUPPY_VIEW_KPIS.fraudDetection, 'guppy', 'view')
    : null;

  // すべてのアラートを結合
  const allAlerts: KPIAlert[] = [
    ...viewKPIs,
    ...scoutKPIs,
    ...(fraudAlert ? [fraudAlert] : []),
  ];

  const [showSolutions, setShowSolutions] = useState(false);
  const guppyProfile = {
    completeness: data.clinic.guppy_profile_completeness ?? null,
    independenceSupport: data.clinic.guppy_independence_support ?? null,
    updatedAt: data.clinic.guppy_profile_updated_at ?? null,
    scrapedAt: data.clinic.guppy_profile_scraped_at ?? null,
  };
  const hasProfileData =
    guppyProfile.completeness !== null ||
    guppyProfile.updatedAt ||
    guppyProfile.scrapedAt;

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      <header className={`border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              {/* パンくずナビゲーション */}
              <nav className={`flex items-center gap-2 text-xs mb-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                <a href="/clinic" className={`hover:underline ${isDark ? "hover:text-slate-300" : "hover:text-slate-600"}`}>クリニック一覧</a>
                <span>/</span>
                <a href={`/clinic/${slug}`} className={`hover:underline ${isDark ? "hover:text-slate-300" : "hover:text-slate-600"}`}>{data.clinic.name}</a>
                <span>/</span>
                <span className={isDark ? "text-slate-300" : "text-slate-600"}>GUPPY</span>
              </nav>

              <div className="flex items-center gap-3">
                <h1 className={`text-xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>{data.clinic.name}</h1>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs font-medium rounded">
                  GUPPY
                </span>
              </div>
              <p className={`text-xs mt-1 tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>アクセス状況ダッシュボード</p>
              <div className="flex gap-2 mt-3">
                <a href={`/clinic/${slug}/guppy`} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg">
                  GUPPY
                </a>
                <a href={`/clinic/${slug}/job-medley`} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
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
            {data.availableMonths.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedMonth === month
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {formatMonth(month)}
              </button>
            ))}
          </div>
        </div>

        {/* 職種タブ */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTab === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              合計
            </button>
            {PHASE1_JOB_TYPES.map((jobType) => (
              <button
                key={jobType}
                onClick={() => setSelectedTab(jobType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === jobType
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {JOB_TYPE_LABELS[jobType]}
              </button>
            ))}
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="表示数" value={data.summary.totalDisplayCount} color="blue" />
          <SummaryCard
            title="閲覧数"
            value={data.summary.totalViewCount}
            color="green"
            subValue={`閲覧率: ${(calculateViewRate(data.summary.totalDisplayCount, data.summary.totalViewCount) * 100).toFixed(1)}%`}
            alert={isViewRateAlert(data.summary.totalDisplayCount, data.summary.totalViewCount)}
          />
          <SummaryCard title="自社サイト誘導" value={data.summary.totalRedirectCount} color="purple" />
          <SummaryCard title="応募数" value={data.summary.totalApplicationCount} color="orange" />
        </div>

        {/* プロフィール情報 */}
        {hasProfileData && (
          <div className="mb-8">
            <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>
              プロフィール情報
            </h2>
            <div className="max-w-md">
              <GuppyProfileCard
                completeness={guppyProfile.completeness}
                independenceSupport={guppyProfile.independenceSupport}
                updatedAt={guppyProfile.updatedAt}
                scrapedAt={guppyProfile.scrapedAt}
              />
            </div>
          </div>
        )}

        {/* KPIアラートセクション */}
        <div className={`rounded-lg shadow mb-8 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} flex items-center justify-between`}>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>KPIアラート</h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                閾値に基づく自動判定・改善施策の提案
              </p>
            </div>
            <button
              onClick={() => setShowSolutions(!showSolutions)}
              className={`text-sm px-3 py-1.5 rounded-lg transition ${
                isDark
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {showSolutions ? '施策対応表を隠す' : '施策対応表を見る'}
            </button>
          </div>
          <div className="p-6">
            {/* 閲覧経路KPI */}
            <div className="mb-6">
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                閲覧経路
              </h3>
              <KPISummary
                title=""
                kpis={viewKPIs.map(kpi => ({
                  title: kpi.kpiName,
                  value: kpi.value,
                  unit: kpi.unit,
                  level: kpi.level,
                  message: kpi.message,
                  solution: kpi.solution,
                }))}
              />
            </div>

            {/* スカウト経路KPI */}
            <div className="mb-6">
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                スカウト経路
              </h3>
              <KPISummary
                title=""
                kpis={scoutKPIs.map(kpi => ({
                  title: kpi.kpiName,
                  value: kpi.value,
                  unit: kpi.unit,
                  level: kpi.level,
                  message: kpi.message,
                  solution: kpi.solution,
                }))}
              />
            </div>

            {/* 不正検知アラート */}
            {fraudAlert && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 text-xl mr-3">🚨</span>
                  <div>
                    <p className="text-red-800 dark:text-red-300 font-medium">
                      不正アクセスの可能性があります
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      閲覧率が{viewRateValue.toFixed(1)}%と異常に高くなっています。GUPPY運営に報告してください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* アラート一覧 */}
            <div>
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                アラート一覧
              </h3>
              <AlertList alerts={allAlerts} />
            </div>
          </div>
        </div>

        {/* 施策対応表（トグル表示） */}
        {showSolutions && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <SolutionTable title="閲覧経路の改善施策" solutions={GUPPY_VIEW_SOLUTIONS} />
            <SolutionTable title="スカウト経路の改善施策" solutions={GUPPY_SCOUT_SOLUTIONS} />
          </div>
        )}

        {/* スカウトメールセクション */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">スカウトメール</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-indigo-700 opacity-80">送信数</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{scoutSummary.sent.toLocaleString()}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4">
                <p className="text-sm text-teal-700 opacity-80">返信数</p>
                <p className="text-2xl font-bold text-teal-700 mt-1">{scoutSummary.reply.toLocaleString()}</p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-4">
                <p className="text-sm text-cyan-700 opacity-80">返信率</p>
                <p className="text-2xl font-bold text-cyan-700 mt-1">{scoutReplyRate}%</p>
              </div>
              <div className="bg-pink-50 rounded-lg p-4">
                <p className="text-sm text-pink-700 opacity-80">Bitlyクリック数</p>
                <p className="text-2xl font-bold text-pink-700 mt-1">{totalBitlyClicks.toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-sm text-amber-700 opacity-80">Bitlyクリック率</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{bitlyClickRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* スカウト文面別クリック数セクション */}
        {data.bitlyLinkClicks && data.bitlyLinkClicks.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">スカウト文面別クリック数</h2>
              <p className="text-sm text-gray-500 mt-1">命名規則: bit.ly/{'{クリニック名}'}-{'{媒体}'}-{'{ID}'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">媒体</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">リンクID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ラベル</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">クリック数</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.bitlyLinkClicks
                    .sort((a, b) => b.total_clicks - a.total_clicks)
                    .map((link) => (
                      <tr key={link.bitly_link_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            link.source === 'guppy' ? 'bg-green-100 text-green-800' :
                            link.source === 'quacareer' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {link.source.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {link.link_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {link.label || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                          {link.total_clicks.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 日別データテーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">日別アクセスログ</h2>
            {selectedMonth && (
              <span className="text-sm text-gray-500">{formatMonth(selectedMonth)}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日付</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">表示数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">閲覧数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">閲覧率</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">自社サイト誘導</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">応募数</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : filteredMetrics.length > 0 ? (
                  filteredMetrics.map((metric) => {
                    const viewRate = calculateViewRate(metric.display_count, metric.view_count);
                    const isAlert = isViewRateAlert(metric.display_count, metric.view_count);

                    return (
                      <tr key={metric.id} className={`hover:bg-gray-50 ${isAlert ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {metric.display_count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {metric.view_count.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${isAlert ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                          {(viewRate * 100).toFixed(1)}%
                          {isAlert && <span className="ml-1" title="不正アクセスの可能性があります">⚠️</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {metric.redirect_count.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                          {metric.application_count > 0 ? (
                            <span className="text-orange-600">{metric.application_count}</span>
                          ) : (
                            metric.application_count
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      データがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

function SummaryCard({
  title,
  value,
  color,
  subValue,
  alert = false
}: {
  title: string;
  value: number;
  color: string;
  subValue?: string;
  alert?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  const alertClasses = alert ? 'ring-2 ring-red-500 bg-red-50 text-red-700' : colorClasses[color];

  return (
    <div className={`rounded-lg p-4 ${alertClasses}`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
      {subValue && (
        <p className={`text-xs mt-1 ${alert ? 'text-red-600 font-semibold' : 'opacity-70'}`}>
          {subValue}
          {alert && ' ⚠️'}
        </p>
      )}
    </div>
  );
}
