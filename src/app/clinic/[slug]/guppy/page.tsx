'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DailyMetrics } from '@/types';

interface ClinicData {
  clinic: { id: string; name: string; slug: string };
  metrics: DailyMetrics[];
  summary: {
    totalDisplayCount: number;
    totalViewCount: number;
    totalRedirectCount: number;
    totalApplicationCount: number;
  };
  availableMonths: string[];
  currentMonth: string | null;
}

export default function GuppyPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<ClinicData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const monthParam = selectedMonth ? `?month=${selectedMonth}` : '';
      const res = await fetch(`/api/clinics/${slug}${monthParam}`);
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
  }, [slug, selectedMonth]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">クライアントが見つかりません</h1>
        </div>
      </div>
    );
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{data.clinic.name}</h1>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              GUPPY
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">アクセス状況ダッシュボード</p>
          <div className="flex gap-2 mt-3">
            <a href={`/clinic/${slug}/guppy`} className="px-3 py-1 bg-green-600 text-white text-sm rounded">
              GUPPY
            </a>
            <a href={`/clinic/${slug}/job-medley`} className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded hover:bg-gray-300">
              ジョブメドレー
            </a>
            <a href={`/clinic/${slug}/quacareer`} className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded hover:bg-gray-300">
              Quacareer
            </a>
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

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="表示数" value={data.summary.totalDisplayCount} color="blue" />
          <SummaryCard title="閲覧数" value={data.summary.totalViewCount} color="green" />
          <SummaryCard title="自社サイト誘導" value={data.summary.totalRedirectCount} color="purple" />
          <SummaryCard title="応募数" value={data.summary.totalApplicationCount} color="orange" />
        </div>

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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">自社サイト誘導</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">応募数</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : data.metrics.length > 0 ? (
                  data.metrics.map((metric) => (
                    <tr key={metric.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {metric.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {metric.display_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {metric.view_count.toLocaleString()}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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

function SummaryCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
