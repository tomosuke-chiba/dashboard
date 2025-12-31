import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCachedSummary, refreshDashboardData } from "@/lib/notion";

const COOKIE_NAME = "dashboard_auth";

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

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(COOKIE_NAME);

    if (authCookie?.value !== "authenticated") {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { year, month, error } = parseYearMonth(
      searchParams.get("year"),
      searchParams.get("month")
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    console.info("Summary request", { year, month });

    // キャッシュがあればそれを返す
    let summary = getCachedSummary(year, month);

    // キャッシュがなければ新規取得
    if (!summary) {
      try {
        summary = await refreshDashboardData(year, month);
      } catch (notionError) {
        console.error("Notion API error:", notionError);
        return NextResponse.json(
          { error: "Notionからデータを取得できませんでした" },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Summary API error:", error);
    return NextResponse.json(
      { error: "集計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
