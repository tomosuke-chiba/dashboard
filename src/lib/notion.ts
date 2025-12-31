import { Client } from "@notionhq/client";
import {
  addDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  getDaysInMonth,
  getDate,
} from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

// Notion クライアント初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// ステータス定義（Notionの実際の値に合わせる）
export const STATUSES = [
  "リード",
  "日程確定",
  "提案・見積",
  "返答待ち",
  "✅契約完了",
  "💰振込確認",
  "失注",
  "時期が来たら連絡",
] as const;

export type Status = (typeof STATUSES)[number];

// 月別ノルマ
const MONTHLY_TARGETS: Record<number, number> = {
  1: 6,
  2: 7,
  3: 7,
  4: 7,
  5: 8,
  6: 8,
  7: 9,
  8: 9,
  9: 9,
  10: 10,
  11: 10,
  12: 10,
};

// 集計結果の型
export interface DashboardSummary {
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
  statusCounts: Record<Status, number>;
  lastRefreshedAt: string;
  year: number;
  month: number;
}

// キャッシュ（年月をキーにした複数キャッシュ）
const cachedSummaries: Map<string, DashboardSummary> = new Map();
let lastRefreshTime: Date | null = null;
const NOTION_QUERY_TIMEOUT_MS = 15000;

function normalizeStatus(status: string | null): Status | null {
  if (!status) return null;
  const trimmed = status.trim();
  if (STATUSES.includes(trimmed as Status)) {
    return trimmed as Status;
  }
  const condensed = trimmed.replace(/\s+/g, "");
  if (STATUSES.includes(condensed as Status)) {
    return condensed as Status;
  }
  if (condensed === "契約完了") return "✅契約完了";
  if (condensed === "振込確認") return "💰振込確認";
  if (condensed === "✅契約完了") return "✅契約完了";
  if (condensed === "💰振込確認") return "💰振込確認";
  if (condensed === "個別相談日程確定") return "リード";
  return null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Notion query timeout"));
    }, timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// 最終更新時刻を取得
export function getLastRefreshTime(): Date | null {
  return lastRefreshTime;
}

// レート制限チェック（1分以内の再実行を拒否）
export function canRefresh(): boolean {
  if (!lastRefreshTime) return true;
  const now = new Date();
  const diffMs = now.getTime() - lastRefreshTime.getTime();
  return diffMs >= 60 * 1000; // 1分 = 60,000ms
}

// キャッシュから取得
export function getCachedSummary(
  year?: number,
  month?: number
): DashboardSummary | null {
  if (year !== undefined && month !== undefined) {
    const key = `${year}-${month}`;
    return cachedSummaries.get(key) || null;
  }
  // デフォルトは現在月
  const now = new Date();
  const jstNow = toZonedTime(now, "Asia/Tokyo");
  const key = `${jstNow.getFullYear()}-${jstNow.getMonth() + 1}`;
  return cachedSummaries.get(key) || null;
}

// Notionからデータを取得して集計
export async function refreshDashboardData(
  year?: number,
  month?: number
): Promise<DashboardSummary> {
  const now = new Date();
  const jstNow = toZonedTime(now, "Asia/Tokyo");
  const targetYear = year ?? jstNow.getFullYear();
  const isYearView = month === 0;
  const targetMonth = isYearView ? undefined : month ?? jstNow.getMonth() + 1; // 1-12
  const targetDate = toZonedTime(
    new Date(targetYear, (targetMonth ?? 1) - 1, 1),
    "Asia/Tokyo"
  );

  // 対象月の開始・終了
  const rangeStart = isYearView
    ? startOfMonth(new Date(targetYear, 0, 1))
    : startOfMonth(targetDate);
  const rangeEnd = isYearView
    ? endOfMonth(new Date(targetYear, 11, 1))
    : endOfMonth(targetDate);

  // ステータス別カウント初期化
  const statusCounts: Record<Status, number> = {
    リード: 0,
    日程確定: 0,
    "提案・見積": 0,
    返答待ち: 0,
    "✅契約完了": 0,
    "💰振込確認": 0,
    失注: 0,
    時期が来たら連絡: 0,
  };

  let thisMonthContracts = 0;
  const dailyContractCounts = new Map<number, number>();
  const monthlyContractCounts = new Map<number, number>();
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  // ページネーションで全件取得
  while (hasMore) {
    const queryResult = await withTimeout(
      notion.databases.query({
        database_id: DATABASE_ID,
        start_cursor: startCursor,
        page_size: 100,
      }),
      NOTION_QUERY_TIMEOUT_MS
    );

    for (const page of queryResult.results) {
      if (!("properties" in page)) continue;

      const properties = page.properties;

      // ステータス取得
      const statusProp = properties["ステータス"];
      let status: string | null = null;

      if (statusProp?.type === "select" && statusProp.select && "name" in statusProp.select) {
        status = statusProp.select.name;
      } else if (statusProp?.type === "status" && statusProp.status && "name" in statusProp.status) {
        status = statusProp.status.name;
      }

      const normalizedStatus = normalizeStatus(status);

      // ステータス別カウント
      if (normalizedStatus) {
        statusCounts[normalizedStatus]++;
      }

      // 契約完了/振込確認の場合、契約完了日をチェック
      if (normalizedStatus === "✅契約完了" || normalizedStatus === "💰振込確認") {
        const contractDateProp = properties["契約完了日"];

        if (contractDateProp?.type === "date" && contractDateProp.date?.start) {
          const contractDate = new Date(contractDateProp.date.start);
          const jstContractDate = toZonedTime(contractDate, "Asia/Tokyo");

          // 当月の契約完了かチェック
          if (
            isWithinInterval(jstContractDate, {
              start: rangeStart,
              end: rangeEnd,
            })
          ) {
            thisMonthContracts++;
            const dayOfMonth = getDate(jstContractDate);
            const monthOfYear = jstContractDate.getMonth() + 1;
            if (isYearView) {
              monthlyContractCounts.set(
                monthOfYear,
                (monthlyContractCounts.get(monthOfYear) || 0) + 1
              );
            } else {
              dailyContractCounts.set(
                dayOfMonth,
                (dailyContractCounts.get(dayOfMonth) || 0) + 1
              );
            }
          }
        }
      }
    }

    hasMore = queryResult.has_more;
    startCursor = queryResult.next_cursor ?? undefined;
  }

  // ノルマ
  const target = isYearView
    ? Object.values(MONTHLY_TARGETS).reduce((sum, value) => sum + value, 0)
    : MONTHLY_TARGETS[targetMonth ?? 0] ?? 0;
  const remaining = Math.max(target - thisMonthContracts, 0);
  const achievementRate = target > 0 ? thisMonthContracts / target : 0;

  // スコアボード系列生成（累積）
  const isCurrentYear = targetYear === jstNow.getFullYear();
  const isCurrentMonth =
    !isYearView &&
    targetYear === jstNow.getFullYear() &&
    targetMonth === jstNow.getMonth() + 1;
  const daysInMonth = getDaysInMonth(targetDate);
  const todayDate = isCurrentMonth ? jstNow : endOfMonth(targetDate);
  const todayDay = getDate(todayDate);
  const series: { date: string; targetCum: number; actualCum: number }[] = [];
  let actualCum = 0;
  let targetAtToday = 0;
  let actualAtToday = 0;

  if (isYearView) {
    const todayMonth = isCurrentYear ? jstNow.getMonth() + 1 : 12;
    for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
      const actualValue = monthlyContractCounts.get(monthIndex) || 0;
      const targetValue = MONTHLY_TARGETS[monthIndex] ?? 0;
      if (monthIndex === todayMonth) {
        targetAtToday = targetValue;
        actualAtToday = actualValue;
      }
      series.push({
        date: formatInTimeZone(
          new Date(targetYear, monthIndex - 1, 1),
          "Asia/Tokyo",
          "yyyy-MM-dd"
        ),
        targetCum: targetValue,
        actualCum: actualValue,
      });
    }
  } else {
    for (let day = 1; day <= daysInMonth; day++) {
      actualCum += dailyContractCounts.get(day) || 0;
      const targetCum = Math.round((target * (day / daysInMonth)) * 10) / 10;
      if (day === todayDay) {
        targetAtToday = targetCum;
        actualAtToday = actualCum;
      }
      series.push({
        date: formatInTimeZone(
          addDays(startOfMonth(targetDate), day - 1),
          "Asia/Tokyo",
          "yyyy-MM-dd"
        ),
        targetCum,
        actualCum,
      });
    }
  }

  const paceStatus: "先行" | "遅れ" =
    actualAtToday >= targetAtToday ? "先行" : "遅れ";

  // 達成見込み計算（当月のみ）
  const elapsedDays = isCurrentMonth ? todayDay : 0;
  const predictedContracts =
    elapsedDays > 0 ? (thisMonthContracts / elapsedDays) * daysInMonth : 0;
  const forecast: "達成見込み" | "未達見込み" | "-" =
    !isCurrentMonth
      ? "-"
      : predictedContracts >= target
        ? "達成見込み"
        : "未達見込み";

  // 結果を作成
  const summary: DashboardSummary = {
    thisMonthContracts,
    target,
    remaining,
    achievementRate,
    forecast,
    paceStatus,
    scoreboard: {
      month: isYearView
        ? `${targetYear}`
        : `${targetYear}-${String(targetMonth).padStart(2, "0")}`,
      daysInMonth: isYearView ? 12 : daysInMonth,
      today: formatInTimeZone(
        isYearView ? new Date(targetYear, 11, 31) : todayDate,
        "Asia/Tokyo",
        "yyyy-MM-dd"
      ),
      series,
    },
    statusCounts,
    lastRefreshedAt: now.toISOString(),
    year: targetYear,
    month: isYearView ? 0 : (targetMonth ?? 0),
  };

  // キャッシュ更新
  const cacheKey = `${targetYear}-${isYearView ? 0 : targetMonth}`;
  cachedSummaries.set(cacheKey, summary);
  lastRefreshTime = now;

  return summary;
}
