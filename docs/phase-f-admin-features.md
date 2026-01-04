# Phase F: 管理者専用機能 - 詳細設計ドキュメント

**作成日**: 2026-01-01
**最終更新**: 2026-01-01
**ステータス**: 実装完了

---

## 目次

1. [概要](#1-概要)
2. [前提条件](#2-前提条件)
3. [機能要件](#3-機能要件)
4. [F-1: 全クリニック一覧画面](#4-f-1-全クリニック一覧画面)
5. [F-2: パスワード管理画面](#5-f-2-パスワード管理画面)
6. [F-3: 横断レポート画面（任意）](#6-f-3-横断レポート画面任意)
7. [共通コンポーネント](#7-共通コンポーネント)
8. [テスト計画](#8-テスト計画)
9. [実装チェックリスト](#9-実装チェックリスト)

---

## 1. 概要

### 1.1 目的

管理者（株式会社KOU担当者）が全クリニックのデータを一元管理できる機能を提供する。

### 1.2 対象ユーザー

| ロール | 説明 | アクセス権限 |
|--------|------|-------------|
| 管理者 | 御社担当者 | 全クリニックのデータ閲覧・編集、パスワード管理 |

### 1.3 機能一覧

| ID | 機能名 | 優先度 | 概要 |
|----|--------|--------|------|
| F-1 | 全クリニック一覧画面 | 必須 | 全クリニックのKPIサマリーを一覧表示 |
| F-2 | パスワード管理画面 | 必須 | クリニック別パスワードの設定・変更 |
| F-3 | 横断レポート画面 | 任意 | 全クリニック横断の集計レポート |

---

## 2. 前提条件

### 2.1 認証基盤（実装済み）

Phase Aで実装済みの認証基盤を使用する。

**認証方式:**
- JWT (HS256) + Cookie (`clinic_auth_token`)
- 有効期限: 7日間
- 管理者判定: JWTペイロードの `isAdmin: true`

**関連ファイル:**
```
src/lib/auth.ts           # 認証ユーティリティ
src/middleware.ts         # ルート保護
src/app/login/page.tsx    # ログインUI
src/app/api/auth/         # 認証API群
```

### 2.2 既存テーブル

#### clinics テーブル
```sql
-- 主要カラムのみ抜粋
id UUID PRIMARY KEY
name TEXT NOT NULL
slug TEXT UNIQUE NOT NULL
guppy_login_id TEXT
guppy_password TEXT
jobmedley_login_id TEXT
jobmedley_password TEXT
quacareer_login_id TEXT
quacareer_password TEXT
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

#### clinic_auth テーブル
```sql
id UUID PRIMARY KEY
clinic_id UUID UNIQUE REFERENCES clinics(id) ON DELETE CASCADE
password_hash TEXT NOT NULL  -- bcrypt ハッシュ
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

### 2.3 環境変数

```env
ADMIN_PASSWORD=xxxxx           # 管理者パスワード（グローバル）
JWT_SECRET=xxxxx               # JWT署名キー（未設定時はADMIN_PASSWORDを使用）
NEXT_PUBLIC_SUPABASE_URL=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### 2.4 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| データベース | Supabase (PostgreSQL) |
| パスワードハッシュ | bcryptjs |
| JWT | jose |

---

## 3. 機能要件

### 3.1 共通要件

1. **認証必須**: 全ページで管理者認証が必要
2. **ダークモード対応**: `useTheme` フックで切り替え可能
3. **レスポンシブ対応**: モバイル/タブレット/デスクトップ
4. **エラーハンドリング**: ネットワークエラー、認証エラー、バリデーションエラー

### 3.2 アクセス制御

```typescript
// src/middleware.ts の保護ロジック
// /admin/* へのアクセスは isAdmin: true のみ許可
if (pathname.startsWith('/admin') && !isAdmin) {
  return NextResponse.redirect(new URL(`/clinic/${clinicSlug}`, request.url));
}
```

---

## 4. F-1: 全クリニック一覧画面

### 4.1 機能概要

全クリニックのKPIサマリーを一覧表示し、各クリニックへのナビゲーションを提供する。

### 4.2 画面仕様

**URL**: `/admin`

**レイアウト:**
```
┌─────────────────────────────────────────────────────────┐
│ [ヘッダー]                                              │
│   管理ダッシュボード              [データ取得] [ログアウト] │
├─────────────────────────────────────────────────────────┤
│ [フィルター・検索]                                      │
│   [検索ボックス] [期間選択]                              │
├─────────────────────────────────────────────────────────┤
│ [クリニック一覧テーブル]                                 │
│   クリニック名 | 応募数 | 閲覧数 | 目標進捗 | パスワード │
│   ─────────────────────────────────────────────────────│
│   うえほんまち | 5      | 120    | 50%     | 設定済み   │
│   ばんどう歯科 | 3      | 80     | 30%     | 未設定     │
│   ...                                                  │
├─────────────────────────────────────────────────────────┤
│ [フッター]                                              │
└─────────────────────────────────────────────────────────┘
```

### 4.3 データ構造

#### レスポンス型（API）
```typescript
// GET /api/admin/clinics のレスポンス
interface AdminClinicListResponse {
  clinics: AdminClinicSummary[];
  total: number;
}

interface AdminClinicSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;

  // メトリクスサマリー（当月）
  metrics: {
    totalApplicationCount: number;
    totalViewCount: number;
    totalDisplayCount: number;
    totalRedirectCount: number;
  };

  // 目標進捗
  goalProgress: {
    totalTargetCount: number;
    totalCurrentCount: number;
    progressRate: number;  // 0-100
    isOnTrack: boolean;
  } | null;

  // パスワード設定状態
  hasPassword: boolean;

  // 最終データ更新日
  latestDataDate: string | null;
}
```

### 4.4 API設計

#### GET /api/admin/clinics

**リクエスト:**
```typescript
// クエリパラメータ
interface AdminClinicsQuery {
  search?: string;      // クリニック名で検索
  month?: string;       // YYYY-MM形式（メトリクス集計期間）
  hasPassword?: 'true' | 'false';  // パスワード設定フィルター
}
```

**レスポンス:**
```typescript
// 成功時
{ clinics: AdminClinicSummary[], total: number }

// エラー時
{ error: string }
```

**実装ファイル**: `src/app/api/admin/clinics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  // 1. 管理者認証チェック
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // 2. クエリパラメータ取得
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const month = searchParams.get('month') || getCurrentMonth(); // YYYY-MM

  try {
    // 3. クリニック一覧取得
    let query = supabase
      .from('clinics')
      .select('id, name, slug, created_at');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: clinics, error } = await query.order('name');
    if (error) throw error;

    // 4. 各クリニックのサマリーを取得
    const clinicsWithSummary = await Promise.all(
      (clinics || []).map(async (clinic) => {
        // メトリクス集計
        const { data: metrics } = await supabase
          .from('metrics')
          .select('application_count, view_count, display_count, redirect_count, date')
          .eq('clinic_id', clinic.id)
          .gte('date', `${month}-01`)
          .lte('date', `${month}-31`);

        const metricsSummary = (metrics || []).reduce(
          (acc, m) => ({
            totalApplicationCount: acc.totalApplicationCount + (m.application_count || 0),
            totalViewCount: acc.totalViewCount + (m.view_count || 0),
            totalDisplayCount: acc.totalDisplayCount + (m.display_count || 0),
            totalRedirectCount: acc.totalRedirectCount + (m.redirect_count || 0),
          }),
          { totalApplicationCount: 0, totalViewCount: 0, totalDisplayCount: 0, totalRedirectCount: 0 }
        );

        // 目標進捗取得
        const { data: goals } = await supabase
          .from('recruitment_goals')
          .select('target_count, current_count')
          .eq('clinic_id', clinic.id);

        let goalProgress = null;
        if (goals && goals.length > 0) {
          const totalTarget = goals.reduce((sum, g) => sum + g.target_count, 0);
          const totalCurrent = goals.reduce((sum, g) => sum + g.current_count, 0);
          goalProgress = {
            totalTargetCount: totalTarget,
            totalCurrentCount: totalCurrent,
            progressRate: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
            isOnTrack: totalTarget > 0 ? (totalCurrent / totalTarget) >= 0.5 : true,
          };
        }

        // パスワード設定確認
        const { data: authData } = await supabase
          .from('clinic_auth')
          .select('id')
          .eq('clinic_id', clinic.id)
          .single();

        // 最新データ日付
        const latestDate = metrics?.[0]?.date || null;

        return {
          id: clinic.id,
          name: clinic.name,
          slug: clinic.slug,
          createdAt: clinic.created_at,
          metrics: metricsSummary,
          goalProgress,
          hasPassword: !!authData,
          latestDataDate: latestDate,
        };
      })
    );

    return NextResponse.json({
      clinics: clinicsWithSummary,
      total: clinicsWithSummary.length
    });
  } catch (error) {
    console.error('Admin clinics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

### 4.5 UIコンポーネント

**実装ファイル**: `src/app/admin/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';

interface AdminClinicSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  metrics: {
    totalApplicationCount: number;
    totalViewCount: number;
    totalDisplayCount: number;
    totalRedirectCount: number;
  };
  goalProgress: {
    totalTargetCount: number;
    totalCurrentCount: number;
    progressRate: number;
    isOnTrack: boolean;
  } | null;
  hasPassword: boolean;
  latestDataDate: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { isDark, toggleTheme, mounted } = useTheme();

  const [clinics, setClinics] = useState<AdminClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // 認証チェック
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.authenticated || !data.isAdmin) {
          router.push('/login');
          return;
        }
        setIsAdmin(true);
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // データ取得
  useEffect(() => {
    if (!isAdmin) return;

    async function fetchClinics() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (selectedMonth) params.set('month', selectedMonth);

        const res = await fetch(`/api/admin/clinics?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setClinics(data.clinics || []);
        }
      } catch (error) {
        console.error('Failed to fetch clinics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchClinics();
  }, [isAdmin, search, selectedMonth]);

  // ログアウト処理
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // 手動スクレイピング
  const handleManualScrape = async () => {
    if (!confirm('全クライアントのデータを取得しますか？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      alert(`スクレイピング完了: ${data.results?.length || 0}件処理`);
      // データ再取得
      window.location.reload();
    } catch {
      alert('スクレイピング中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* ヘッダー */}
      <header className={`border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className={`text-xl font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              管理ダッシュボード
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              全クリニック一覧
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <Link
              href="/admin/passwords"
              className={`px-4 py-2 text-sm rounded-lg transition ${
                isDark
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              パスワード管理
            </Link>
            <button
              onClick={handleManualScrape}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? '処理中...' : 'データ取得'}
            </button>
            <button
              onClick={handleLogout}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                isDark
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* フィルター */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="クリニック名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`px-4 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500'
                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
            }`}
          />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`px-4 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          />
        </div>

        {/* クリニック一覧テーブル */}
        {loading ? (
          <div className="text-center py-8">
            <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>読み込み中...</p>
          </div>
        ) : (
          <div className={`rounded-lg shadow overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className={isDark ? 'bg-slate-700' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    クリニック名
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    応募数
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    閲覧数
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    目標進捗
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    パスワード
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {clinics.map((clinic) => (
                  <tr key={clinic.id} className={isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      <div className="text-sm font-medium">{clinic.name}</div>
                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {clinic.slug}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      <span className={clinic.metrics.totalApplicationCount > 0 ? 'text-emerald-500 font-semibold' : ''}>
                        {clinic.metrics.totalApplicationCount}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {clinic.metrics.totalViewCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {clinic.goalProgress ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                clinic.goalProgress.isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(clinic.goalProgress.progressRate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {clinic.goalProgress.progressRate}%
                          </span>
                        </div>
                      ) : (
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>未設定</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {clinic.hasPassword ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          設定済み
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          未設定
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/clinic/${clinic.slug}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          詳細
                        </Link>
                        <Link
                          href={`/clinic/${clinic.slug}/settings`}
                          className="text-slate-600 dark:text-slate-400 hover:underline text-sm"
                        >
                          設定
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && clinics.length === 0 && (
          <div className={`rounded-lg p-8 text-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>
              クリニックが見つかりません
            </p>
          </div>
        )}
      </main>

      <footer className={`border-t mt-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`max-w-7xl mx-auto px-4 py-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Powered by 株式会社KOU
        </div>
      </footer>
    </div>
  );
}
```

---

## 5. F-2: パスワード管理画面

### 5.1 機能概要

クリニック別パスワードの設定・変更を行う管理画面。

### 5.2 画面仕様

**URL**: `/admin/passwords`

**レイアウト:**
```
┌─────────────────────────────────────────────────────────┐
│ [ヘッダー]                                              │
│   パスワード管理                           [← 戻る]    │
├─────────────────────────────────────────────────────────┤
│ [クリニック別パスワード設定]                             │
│                                                        │
│   ┌─────────────────────────────────────────────────┐  │
│   │ クリニック選択: [ドロップダウン ▼]               │  │
│   │ 新しいパスワード: [**********]                   │  │
│   │ パスワード確認: [**********]                     │  │
│   │ [パスワードを設定]                               │  │
│   └─────────────────────────────────────────────────┘  │
│                                                        │
├─────────────────────────────────────────────────────────┤
│ [パスワード設定状況一覧]                                │
│   クリニック名      | ステータス | 最終更新 | アクション │
│   ─────────────────────────────────────────────────────│
│   うえほんまち歯科  | 設定済み   | 12/30    | [変更]     │
│   ばんどう歯科      | 未設定     | -        | [設定]     │
└─────────────────────────────────────────────────────────┘
```

### 5.3 データ構造

#### レスポンス型（API）
```typescript
// GET /api/admin/passwords のレスポンス
interface PasswordStatusResponse {
  clinics: PasswordStatus[];
}

interface PasswordStatus {
  id: string;
  name: string;
  slug: string;
  hasPassword: boolean;
  passwordUpdatedAt: string | null;
}
```

### 5.4 API設計

#### GET /api/admin/passwords

**実装ファイル**: `src/app/api/admin/passwords/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // 管理者認証チェック
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // クリニック一覧取得
    const { data: clinics, error: clinicsError } = await supabase
      .from('clinics')
      .select('id, name, slug')
      .order('name');

    if (clinicsError) throw clinicsError;

    // パスワード設定状況を結合
    const clinicsWithStatus = await Promise.all(
      (clinics || []).map(async (clinic) => {
        const { data: authData } = await supabase
          .from('clinic_auth')
          .select('updated_at')
          .eq('clinic_id', clinic.id)
          .single();

        return {
          id: clinic.id,
          name: clinic.name,
          slug: clinic.slug,
          hasPassword: !!authData,
          passwordUpdatedAt: authData?.updated_at || null,
        };
      })
    );

    return NextResponse.json({ clinics: clinicsWithStatus });
  } catch (error) {
    console.error('Password status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### POST /api/admin/passwords

**リクエスト:**
```typescript
interface SetPasswordRequest {
  clinicId: string;
  password: string;
}
```

**実装:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie, setClinicPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 管理者認証チェック
  const auth = await getAuthFromCookie();
  if (!auth.success || !auth.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { clinicId, password } = await request.json();

    // バリデーション
    if (!clinicId || !password) {
      return NextResponse.json({ error: 'clinicId and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // パスワード設定
    const result = await setClinicPassword(clinicId, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 5.5 UIコンポーネント

**実装ファイル**: `src/app/admin/passwords/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';

interface PasswordStatus {
  id: string;
  name: string;
  slug: string;
  hasPassword: boolean;
  passwordUpdatedAt: string | null;
}

export default function PasswordsPage() {
  const router = useRouter();
  const { isDark, toggleTheme, mounted } = useTheme();

  const [clinics, setClinics] = useState<PasswordStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // フォーム状態
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 認証チェック
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.authenticated || !data.isAdmin) {
          router.push('/login');
          return;
        }
        setIsAdmin(true);
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // データ取得
  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/passwords');
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
      }
    } catch (error) {
      console.error('Failed to fetch password status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // パスワード設定
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // バリデーション
    if (!selectedClinicId) {
      setFormError('クリニックを選択してください');
      return;
    }

    if (password.length < 8) {
      setFormError('パスワードは8文字以上で入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('パスワードが一致しません');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: selectedClinicId, password }),
      });

      if (res.ok) {
        setFormSuccess('パスワードを設定しました');
        setPassword('');
        setConfirmPassword('');
        setSelectedClinicId('');
        fetchData(); // リスト更新
      } else {
        const data = await res.json();
        setFormError(data.error || 'パスワードの設定に失敗しました');
      }
    } catch {
      setFormError('ネットワークエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (!mounted || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* ヘッダー */}
      <header className={`border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className={`text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ← 管理画面に戻る
            </Link>
            <h1 className={`text-xl font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              パスワード管理
            </h1>
          </div>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* パスワード設定フォーム */}
        <div className={`rounded-lg shadow p-6 mb-8 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            パスワードを設定
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3">
                <p className="text-sm text-green-700 dark:text-green-400">{formSuccess}</p>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                クリニック
              </label>
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="">クリニックを選択...</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name} {clinic.hasPassword ? '(設定済み)' : '(未設定)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                新しいパスワード（8文字以上）
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                パスワード確認
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? '設定中...' : 'パスワードを設定'}
            </button>
          </form>
        </div>

        {/* パスワード設定状況一覧 */}
        <div className={`rounded-lg shadow overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              パスワード設定状況
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>読み込み中...</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className={isDark ? 'bg-slate-700' : 'bg-slate-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    クリニック名
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    ステータス
                  </th>
                  <th className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    最終更新
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {clinics.map((clinic) => (
                  <tr key={clinic.id} className={isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}>
                    <td className={`px-6 py-4 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      <div className="text-sm font-medium">{clinic.name}</div>
                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {clinic.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {clinic.hasPassword ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          設定済み
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          未設定
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {formatDate(clinic.passwordUpdatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
```

---

## 6. F-3: 横断レポート画面（任意）

### 6.1 機能概要

全クリニックを横断した集計レポートを表示する。

**注意**: この機能は任意（オプション）です。F-1, F-2の完成後に検討してください。

### 6.2 画面仕様

**URL**: `/admin/reports`

**表示項目案:**
- 全クリニック合計の応募数・閲覧数
- 媒体別（GUPPY/ジョブメドレー/クオキャリア）の集計
- 職種別の採用状況
- 月次推移グラフ

### 6.3 実装優先度

低（F-1, F-2完了後に着手）

---

## 7. 共通コンポーネント

### 7.1 useTheme フック

**ファイル**: `src/hooks/useTheme.ts`（既存）

```typescript
// 使用例
const { isDark, toggleTheme, mounted } = useTheme();
```

### 7.2 ThemeToggle コンポーネント

**ファイル**: `src/hooks/useTheme.ts`（既存）

```typescript
// 使用例
<ThemeToggle isDark={isDark} onToggle={toggleTheme} />
```

### 7.3 スタイルパターン

#### ダークモード対応の基本パターン
```typescript
// 背景色
className={isDark ? 'bg-slate-900' : 'bg-slate-50'}

// カード背景
className={isDark ? 'bg-slate-800' : 'bg-white'}

// テキスト色
className={isDark ? 'text-slate-100' : 'text-slate-800'}  // 見出し
className={isDark ? 'text-slate-400' : 'text-slate-500'}  // サブテキスト

// ボーダー
className={isDark ? 'border-slate-700' : 'border-slate-200'}

// ホバー
className={isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}
```

#### ステータスバッジ
```typescript
// 成功/設定済み
<span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
  設定済み
</span>

// 警告/未設定
<span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
  未設定
</span>
```

---

## 8. テスト計画

### 8.1 手動テスト項目

#### F-1: 全クリニック一覧画面
- [ ] 管理者でログイン後、`/admin` にアクセスできる
- [ ] 非管理者は `/admin` にアクセスできない（リダイレクト）
- [ ] クリニック一覧が正しく表示される
- [ ] 検索フィルターが機能する
- [ ] 月選択でメトリクスが切り替わる
- [ ] 「詳細」リンクでクリニック詳細ページに遷移する
- [ ] 「設定」リンクでクリニック設定ページに遷移する
- [ ] ダークモード切り替えが機能する

#### F-2: パスワード管理画面
- [ ] `/admin/passwords` にアクセスできる
- [ ] クリニック選択ドロップダウンが機能する
- [ ] パスワードが8文字未満の場合エラーが表示される
- [ ] パスワード確認が一致しない場合エラーが表示される
- [ ] パスワード設定成功時にメッセージが表示される
- [ ] パスワード設定後、一覧のステータスが更新される
- [ ] 設定済みクリニックのパスワードを変更できる

### 8.2 APIテスト項目

```bash
# 管理者認証でログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"slug": "any-clinic", "password": "${ADMIN_PASSWORD}"}'

# クリニック一覧取得
curl http://localhost:3000/api/admin/clinics \
  -H "Cookie: clinic_auth_token=..."

# パスワード設定状況取得
curl http://localhost:3000/api/admin/passwords \
  -H "Cookie: clinic_auth_token=..."

# パスワード設定
curl -X POST http://localhost:3000/api/admin/passwords \
  -H "Content-Type: application/json" \
  -H "Cookie: clinic_auth_token=..." \
  -d '{"clinicId": "xxx", "password": "newpassword123"}'
```

---

## 9. 実装チェックリスト

### 9.1 F-1: 全クリニック一覧画面

```
実装順序:
1. [x] API: /api/admin/clinics の実装
   - ファイル: src/app/api/admin/clinics/route.ts
   - 管理者認証チェック
   - クリニック一覧取得
   - メトリクス集計
   - 目標進捗取得
   - パスワード設定状況取得

2. [x] UI: /admin ページの刷新
   - ファイル: src/app/admin/page.tsx
   - 既存の sessionStorage 認証を削除
   - JWT/Cookie ベースの認証に統一
   - 新しいテーブルUIの実装
   - 検索・フィルター機能
   - パスワード管理画面へのリンク追加

3. [x] 動作確認
   - ログイン→管理画面→一覧表示
   - 検索機能
   - 月選択機能
   - 各種リンクの遷移確認
```

### 9.2 F-2: パスワード管理画面

```
実装順序:
1. [x] API: /api/admin/passwords の実装
   - ファイル: src/app/api/admin/passwords/route.ts
   - GET: パスワード設定状況一覧
   - POST: パスワード設定/更新

2. [x] UI: /admin/passwords ページの作成
   - ファイル: src/app/admin/passwords/page.tsx
   - パスワード設定フォーム
   - パスワード設定状況テーブル
   - バリデーション
   - 成功/エラーメッセージ

3. [x] 動作確認
   - 新規パスワード設定
   - 既存パスワード変更
   - バリデーションエラー表示
```

### 9.3 完了条件

- [x] すべての手動テスト項目がパス
- [x] 管理者でない場合のアクセス制御が機能
- [x] ダークモード対応が完了
- [x] エラーハンドリングが適切

---

## 付録

### A. ファイル構成（新規・変更）

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx              # 変更: 管理者一覧画面刷新
│   │   └── passwords/
│   │       └── page.tsx          # 新規: パスワード管理画面
│   └── api/
│       └── admin/
│           ├── clinics/
│           │   └── route.ts      # 新規: クリニック一覧API
│           └── passwords/
│               └── route.ts      # 新規: パスワード管理API
```

### B. 関連ドキュメント

- [docs/requirements.md](./requirements.md) - 全体要件定義
- [docs/dashboard-strategy.md](./dashboard-strategy.md) - 戦略・KPI定義

### C. 既存実装の参考

- `src/app/clinic/[slug]/settings/page.tsx` - 設定画面のUI参考
- `src/components/GoalForm.tsx` - フォームコンポーネント参考
- `src/lib/auth.ts` - 認証ユーティリティ
