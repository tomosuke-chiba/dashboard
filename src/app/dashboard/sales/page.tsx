"use client";

import { useState, useEffect, useCallback } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface DashboardSummary {
  thisMonthContracts: number;
  target: number;
  remaining: number;
  achievementRate: number;
  forecast: "達成見込み" | "未達見込み" | "-";
  paceStatus: "先行" | "遅れ";
  scoreboard: {
    month: string;
    daysInMonth: number;
    today: string;
    series: { date: string; targetCum: number; actualCum: number }[];
  };
  statusCounts: Record<string, number>;
  lastRefreshedAt: string;
  year: number;
  month: number;
}

// デザインシステム: モノトーン + アクセント1色(emerald) + 警告1色(amber)
const STATUS_COLORS_LIGHT: Record<string, string> = {
  リード: "#64748B",
  日程確定: "#475569",
  "提案・見積": "#334155",
  返答待ち: "#94A3B8",
  "✅契約完了": "#10B981",
  "💰振込確認": "#10B981",
  失注: "#CBD5E1",
  時期が来たら連絡: "#E2E8F0",
};

const STATUS_COLORS_DARK: Record<string, string> = {
  リード: "#94A3B8",
  日程確定: "#CBD5E1",
  "提案・見積": "#E2E8F0",
  返答待ち: "#64748B",
  "✅契約完了": "#34D399",
  "💰振込確認": "#34D399",
  失注: "#475569",
  時期が来たら連絡: "#334155",
};

// テーマアイコン
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// 目標アイコン: シンプルな旗
function TargetIcon({ x, y }: { x: number; y: number }) {
  return (
    <svg x={x} y={y} width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4v16M5 4l12 4-12 4"
        stroke="#F59E0B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 実績アイコン: シンプルなチェックマーク
function ActualIcon({ x, y }: { x: number; y: number }) {
  return (
    <svg x={x} y={y} width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="2.5" fill="none" />
      <path
        d="M8 12l3 3 5-6"
        stroke="#10B981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScoreboardTooltip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: Array<{ payload: { targetCum: number; actualCum: number } }>;
  label?: string;
  isDark?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const diff = Math.round((data.actualCum - data.targetCum) * 10) / 10;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs shadow-lg ${isDark ? "bg-slate-800 border-slate-600" : "bg-white border-slate-100"}`}>
      <div className={`font-medium mb-1 ${isDark ? "text-slate-200" : "text-slate-700"}`}>{label}</div>
      <div className={`flex items-center gap-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        <span className="w-2 h-0.5 bg-amber-500 rounded"></span>
        目標: {data.targetCum}
      </div>
      <div className={`flex items-center gap-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        <span className="w-2 h-0.5 bg-emerald-500 rounded"></span>
        実績: {data.actualCum}
      </div>
      <div className={`mt-1 pt-1 border-t ${isDark ? "border-slate-600" : "border-slate-100"} ${diff >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
        差分: {diff > 0 ? "+" : ""}{diff}
      </div>
    </div>
  );
}

export default function SalesDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("current");
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  // テーマの初期化とlocalStorage永続化
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-theme");
    if (saved === "dark") {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const STATUS_COLORS = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;

  const monthOptions = [
    { value: "current", label: "当月" },
    { value: "2026-all", label: "2026年通年", year: 2026, month: 0 },
    { value: "2026-1", label: "2026/01", year: 2026, month: 1 },
    { value: "2026-2", label: "2026/02", year: 2026, month: 2 },
    { value: "2026-3", label: "2026/03", year: 2026, month: 3 },
    { value: "2026-4", label: "2026/04", year: 2026, month: 4 },
    { value: "2026-5", label: "2026/05", year: 2026, month: 5 },
    { value: "2026-6", label: "2026/06", year: 2026, month: 6 },
    { value: "2026-7", label: "2026/07", year: 2026, month: 7 },
    { value: "2026-8", label: "2026/08", year: 2026, month: 8 },
    { value: "2026-9", label: "2026/09", year: 2026, month: 9 },
    { value: "2026-10", label: "2026/10", year: 2026, month: 10 },
    { value: "2026-11", label: "2026/11", year: 2026, month: 11 },
    { value: "2026-12", label: "2026/12", year: 2026, month: 12 },
  ] as const;

  const selectedOption = monthOptions.find((option) => option.value === selectedMonth);

  // 認証状態チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/dashboard/auth");
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // データ取得
  const fetchSummary = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setErrorMessage("");
    try {
      const query =
        selectedOption && selectedOption.value !== "current"
          ? `?year=${selectedOption.year}&month=${selectedOption.month}`
          : "";
      const res = await fetch(`/api/dashboard/summary${query}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSummary(data);
      } else {
        setErrorMessage(data.error || "集計データの取得に失敗しました");
      }
    } catch (err: unknown) {
      console.error("Error fetching summary:", err);
      setErrorMessage("集計データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedMonth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
    }
  }, [isAuthenticated, fetchSummary, selectedMonth]);

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/dashboard/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setError(data.error || "ログインに失敗しました");
      }
    } catch {
      setError("ログイン処理に失敗しました");
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await fetch("/api/dashboard/auth", { method: "DELETE" });
      setIsAuthenticated(false);
      setSummary(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // データ更新処理
  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMessage("");
    try {
      const query =
        selectedOption && selectedOption.value !== "current"
          ? `?year=${selectedOption.year}&month=${selectedOption.month}`
          : "";
      const res = await fetch(`/api/dashboard/refresh${query}`, { method: "POST" });
      const data = await res.json();

      if (res.ok && data.summary) {
        setSummary(data.summary);
        showToast("データを更新しました", "success");
      } else {
        const message = data.error || "更新に失敗しました";
        setErrorMessage(message);
        showToast(message, "error");
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch {
      setErrorMessage("更新処理に失敗しました");
      showToast("更新処理に失敗しました", "error");
    } finally {
      setRefreshing(false);
    }
  };

  // トースト表示
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // 日時フォーマット
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  };

  // ローディング中
  if (isAuthenticated === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="animate-pulse space-y-3">
          <div className={`h-3 w-24 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
          <div className={`h-3 w-16 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
        </div>
      </div>
    );
  }

  // ログイン画面
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className={`p-10 rounded-2xl border w-full max-w-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition ${isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <h1 className={`text-xl font-semibold text-center mb-8 tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
            Sales Dashboard
          </h1>
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label
                htmlFor="password"
                className={`block text-xs font-medium uppercase tracking-wider mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                パスワード
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${isDark ? "bg-slate-900 border-slate-600 text-slate-100 focus:ring-slate-600 focus:border-slate-500 placeholder-slate-500" : "bg-white border-slate-200 text-slate-800 focus:ring-slate-200 focus:border-slate-300 placeholder-slate-400"}`}
                placeholder="Enter password"
              />
            </div>
            {error && (
              <p className={`text-sm mb-4 px-3 py-2 rounded-lg ${isDark ? "text-red-400 bg-red-900/30" : "text-red-600 bg-red-50"}`}>
                {error}
              </p>
            )}
            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-lg font-medium transition ${isDark ? "bg-slate-100 text-slate-900 hover:bg-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ダッシュボード
  const leadDisplayCount = summary
    ? (summary.statusCounts["リード"] ?? 0) + (summary.statusCounts["日程確定"] ?? 0)
    : 0;
  const scoreboardSeries = summary?.scoreboard?.series ?? [];
  const lastScoreboardIndex = scoreboardSeries.length - 1;
  const isYearView = summary?.month === 0;
  const yearYAxisTicks = isYearView
    ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : undefined;

  const renderTargetDot = (props: { cx?: number; cy?: number; index?: number }) => {
    if (props.index !== lastScoreboardIndex) return null;
    if (props.cx === undefined || props.cy === undefined) return null;
    return <TargetIcon x={props.cx - 10} y={props.cy - 10} />;
  };

  const renderActualDot = (props: { cx?: number; cy?: number; index?: number }) => {
    if (props.index !== lastScoreboardIndex) return null;
    if (props.cx === undefined || props.cy === undefined) return null;
    return <ActualIcon x={props.cx - 10} y={props.cy - 10} />;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      {/* トースト */}
      {toast.show && (
        <div
          className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ヘッダー */}
      <header className={`border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="max-w-6xl mx-auto px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              Sales Dashboard
            </h1>
            {summary && (
              <p className={`text-xs mt-1 tracking-wide ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                更新 {formatDateTime(summary.lastRefreshedAt)}
              </p>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${isDark ? "bg-slate-900 border-slate-600 text-slate-200 focus:ring-slate-600" : "bg-white border-slate-200 text-slate-700 focus:ring-slate-200"}`}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${isDark ? "bg-slate-100 text-slate-900 hover:bg-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
            >
              {refreshing ? "更新中..." : "更新"}
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition ${isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={handleLogout}
              className={`px-3 py-2 text-sm transition ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {errorMessage && (
          <div className={`mb-8 rounded-lg border px-5 py-4 text-sm ${isDark ? "bg-red-900/30 border-red-800 text-red-400" : "bg-red-50 border-red-100 text-red-700"}`}>
            {errorMessage}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse space-y-4 w-full max-w-md">
              <div className={`h-4 rounded w-3/4 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-4 rounded w-1/2 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-4 rounded w-2/3 ${isDark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            </div>
          </div>
        ) : summary ? (
          <div className="space-y-10">
            {/* スコアボード */}
            <section className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <h2 className={`text-base font-medium ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    進捗チャート
                  </h2>
                  <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {summary.scoreboard.month}
                    {summary.month === 0 ? "年" : ""} / {summary.scoreboard.today}
                  </p>
                </div>
                <div className={`flex items-center gap-6 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-amber-500 rounded"></span>
                    目標
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-emerald-500 rounded"></span>
                    実績
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="h-64 min-w-[720px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreboardSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#E2E8F0"} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          isYearView
                            ? `${Number(String(value).slice(5, 7))}月`
                            : String(value).slice(8)
                        }
                        interval={isYearView ? 0 : undefined}
                        tick={{ fontSize: 11, fill: isDark ? "#64748B" : "#94A3B8" }}
                        axisLine={{ stroke: isDark ? "#334155" : "#E2E8F0" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={isYearView ? [0, 12] : [0, "auto"]}
                        ticks={yearYAxisTicks}
                        tick={{ fontSize: 11, fill: isDark ? "#64748B" : "#94A3B8" }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip content={<ScoreboardTooltip isDark={isDark} />} />
                      <Line
                        type="monotone"
                        dataKey="targetCum"
                        stroke="#F59E0B"
                        name="目標"
                        strokeWidth={2}
                        dot={renderTargetDot}
                        activeDot={{ r: 5, stroke: "#F59E0B", strokeWidth: 2, fill: isDark ? "#1E293B" : "#FFF" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="actualCum"
                        stroke="#10B981"
                        name="実績"
                        strokeWidth={2}
                        dot={renderActualDot}
                        activeDot={{ r: 5, stroke: "#10B981", strokeWidth: 2, fill: isDark ? "#1E293B" : "#FFF" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* KPIカード - 3枚メイン */}
            <div className="grid grid-cols-3 gap-6">
              {/* リード件数 */}
              <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {summary.month === 0 ? "年間リード" : "リード"}
                </p>
                <p className={`text-4xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  {leadDisplayCount}
                  <span className={`text-base font-normal ml-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>件</span>
                </p>
              </div>
              {/* 今月成約数 */}
              <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {summary.month === 0 ? "年間成約" : "成約"}
                </p>
                <p className={`text-4xl font-semibold tracking-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  {summary.thisMonthContracts}
                  <span className={`text-base font-normal ml-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>件</span>
                </p>
              </div>
              {/* 達成率 */}
              <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  達成率
                </p>
                <p className={`text-4xl font-semibold tracking-tight ${
                  summary.achievementRate >= 1 ? "text-emerald-500" : isDark ? "text-slate-100" : "text-slate-800"
                }`}>
                  {Math.round(summary.achievementRate * 100)}
                  <span className={`text-base font-normal ml-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>%</span>
                </p>
              </div>
            </div>

            {/* 進捗バー */}
            <div className={`rounded-2xl p-6 border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {summary.month === 0 ? "年間進捗" : "今月の進捗"}
                </p>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  <span className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{summary.thisMonthContracts}</span>
                  <span className={isDark ? "text-slate-500" : "text-slate-400"}> / {summary.target}</span>
                </p>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.achievementRate >= 1 ? "bg-emerald-500" : isDark ? "bg-slate-400" : "bg-slate-700"
                  }`}
                  style={{ width: `${Math.min(summary.achievementRate * 100, 100)}%` }}
                />
              </div>
              {summary.remaining > 0 && (
                <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  あと <span className="font-medium text-amber-500">{summary.remaining}件</span> で目標達成
                </p>
              )}
            </div>

            {/* ステータス別滞留 */}
            <section className={`rounded-2xl p-8 border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
              <h2 className={`text-base font-medium mb-6 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                ステータス別件数
              </h2>
              <div className="space-y-3">
                {Object.entries(summary.statusCounts).map(([status, count]) => {
                  const maxCount = Math.max(...Object.values(summary.statusCounts), 1);
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={status} className="flex items-center gap-4">
                      <span className={`text-sm w-28 shrink-0 truncate ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {status.replace(/[✅💰]/g, "").trim()}
                      </span>
                      <div className={`flex-1 h-6 rounded overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-50"}`}>
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: STATUS_COLORS[status] || "#64748B",
                          }}
                        />
                      </div>
                      <span className={`text-sm font-semibold w-12 text-right ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className={`rounded-2xl p-12 border text-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
            <p className={`text-sm mb-6 ${isDark ? "text-slate-500" : "text-slate-400"}`}>データがありません</p>
            <button
              onClick={handleRefresh}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${isDark ? "bg-slate-100 text-slate-900 hover:bg-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
            >
              データを取得
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
