'use client';

import { useState, useEffect } from 'react';
import type { ManualMetricsInputProps } from '@/types';

export default function ManualMetricsInput({
  clinicId,
  source,
  isDark,
  initialYear,
  initialMonth,
}: ManualMetricsInputProps) {
  const [selectedYear, setSelectedYear] = useState<number>(
    initialYear ?? new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    initialMonth ?? new Date().getMonth() + 1
  );
  const [scoutReplyInputs, setScoutReplyInputs] = useState<Record<string, number>>({});
  const [interviewInputs, setInterviewInputs] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // 保存処理
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const entries = dateList
        .map((date) => ({
          date,
          scout_reply_count: scoutReplyInputs[date] ?? 0,
          interview_count: interviewInputs[date] ?? 0,
        }))
        .filter((entry) => entry.scout_reply_count > 0 || entry.interview_count > 0);

      if (entries.length === 0) {
        setSaveMessage({ type: 'error', text: '入力データがありません' });
        setSaving(false);
        return;
      }

      const res = await fetch('/api/metrics/manual-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinicId, source, entries }),
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

  const scoutReplyTotal = Object.values(scoutReplyInputs).reduce((sum, v) => sum + (v || 0), 0);
  const interviewTotal = Object.values(interviewInputs).reduce((sum, v) => sum + (v || 0), 0);

  return (
    <div className={`rounded-lg shadow ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          手動入力メトリクス（スカウト返信数・面接設定数）
        </h2>
      </div>
      <div className="p-6">
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

        {/* 日別入力フォーム */}
        <div className={`border rounded-lg p-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {selectedYear}年{selectedMonth}月の日別入力
            </h3>
            <div className="flex items-center gap-3">
              {saveMessage && (
                <span
                  className={`text-sm ${
                    saveMessage.type === 'success' ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {saveMessage.text}
                </span>
              )}
              <button
                onClick={handleSave}
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

          <div className="grid grid-cols-7 gap-3">
            {dateList.map((dateStr) => {
              const day = parseInt(dateStr.split('-')[2], 10);
              const dayOfWeek = new Date(dateStr).getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              return (
                <div key={dateStr} className="flex flex-col items-center">
                  <label
                    className={`text-xs mb-1 font-medium ${
                      isWeekend
                        ? dayOfWeek === 0
                          ? 'text-red-500'
                          : 'text-blue-500'
                        : isDark
                          ? 'text-slate-400'
                          : 'text-slate-600'
                    }`}
                  >
                    {day}日
                  </label>
                  <div className="w-full space-y-1">
                    {/* スカウト返信数 */}
                    <div>
                      <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        返信
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={scoutReplyInputs[dateStr] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setScoutReplyInputs((prev) => ({ ...prev, [dateStr]: val }));
                        }}
                        className={`w-full px-2 py-1 text-center text-sm rounded border ${
                          isDark
                            ? 'bg-slate-700 border-slate-600 text-slate-100'
                            : 'bg-white border-slate-300 text-slate-800'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                    {/* 面接設定数 */}
                    <div>
                      <label className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        面接
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={interviewInputs[dateStr] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setInterviewInputs((prev) => ({ ...prev, [dateStr]: val }));
                        }}
                        className={`w-full px-2 py-1 text-center text-sm rounded border ${
                          isDark
                            ? 'bg-slate-700 border-slate-600 text-slate-100'
                            : 'bg-white border-slate-300 text-slate-800'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-4 space-y-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <p>入力合計（スカウト返信数）: {scoutReplyTotal}件</p>
            <p>入力合計（面接設定数）: {interviewTotal}件</p>
          </div>
        </div>
      </div>
    </div>
  );
}
