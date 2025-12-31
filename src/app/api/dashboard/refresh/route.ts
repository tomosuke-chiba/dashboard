import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  canRefresh,
  refreshDashboardData,
  getCachedSummary,
} from "@/lib/notion";

const COOKIE_NAME = "dashboard_auth";
const CRON_SECRET = process.env.CRON_SECRET || "";

function parseYearMonth(yearParam: string | null, monthParam: string | null) {
  if (!yearParam && !monthParam) {
    return { year: undefined, month: undefined, error: null };
  }
  if (!yearParam) {
    return { year: undefined, month: undefined, error: "yearとmonthはセットで指定してください" };
  }
  if (!/^\d{4}$/.test(yearParam)) {
    return { year: undefined, month: undefined, error: "yearは4桁で指定してください" };
  }
  if (!monthParam) {
    return { year: Number(yearParam), month: 0, error: null };
  }
  if (monthParam === "all" || monthParam === "0") {
    return { year: Number(yearParam), month: 0, error: null };
  }
  const monthNum = Number(monthParam);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return { year: undefined, month: undefined, error: "monthは1〜12で指定してください" };
  }
  return { year: Number(yearParam), month: monthNum, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { year, month, error } = parseYearMonth(
      searchParams.get("year"),
      searchParams.get("month")
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Cronからのリクエストかチェック
    const authHeader = request.headers.get("authorization");
    const isCronRequest = authHeader === `Bearer ${CRON_SECRET}`;

    // Cronでない場合は認証チェック
    if (!isCronRequest) {
      const cookieStore = await cookies();
      const authCookie = cookieStore.get(COOKIE_NAME);

      if (authCookie?.value !== "authenticated") {
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }

      // レート制限チェック（手動更新のみ）
      if (!canRefresh()) {
        return NextResponse.json(
          { error: "更新は1分に1回までです。しばらくお待ちください。" },
          { status: 429 }
        );
      }
    }

    // データ更新
    try {
      console.info("Refresh request", { year, month, isCronRequest });
      const summary = await refreshDashboardData(year, month);
      return NextResponse.json({
        success: true,
        summary,
      });
    } catch (notionError) {
      console.error("Notion API error:", notionError);

      // キャッシュがあればそれを返す
      const cachedSummary = getCachedSummary(year, month);
      if (cachedSummary) {
        return NextResponse.json({
          success: false,
          error: "Notionからの取得に失敗しましたが、前回のデータを表示しています",
          summary: cachedSummary,
        });
      }

      return NextResponse.json(
        { error: "Notionからデータを取得できませんでした" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Refresh API error:", error);
    return NextResponse.json(
      { error: "更新処理に失敗しました" },
      { status: 500 }
    );
  }
}
