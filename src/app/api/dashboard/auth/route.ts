import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "";
const COOKIE_NAME = "dashboard_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24時間

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "パスワードを入力してください" },
        { status: 400 }
      );
    }

    if (password !== DASHBOARD_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "パスワードが正しくありません" },
        { status: 401 }
      );
    }

    // 認証成功 - Cookieを設定
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "認証処理に失敗しました" },
      { status: 500 }
    );
  }
}

// 認証状態チェック
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(COOKIE_NAME);

    const isAuthenticated = authCookie?.value === "authenticated";

    return NextResponse.json({ authenticated: isAuthenticated });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

// ログアウト
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "ログアウトに失敗しました" },
      { status: 500 }
    );
  }
}
