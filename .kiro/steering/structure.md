# Project Structure

## Organization Philosophy

Next.js App Router の規約に従い、`src/` ディレクトリ配下で機能別に整理。ページ、API、共通コンポーネント、ユーティリティを分離。

## Directory Patterns

### App Router Pages (`/src/app/`)
**Location**: `src/app/[route]/page.tsx`
**Purpose**: ページコンポーネント（サーバーコンポーネント優先）
**Example**: `src/app/clinic/[slug]/page.tsx` - クリニック詳細ページ

### API Routes (`/src/app/api/`)
**Location**: `src/app/api/[endpoint]/route.ts`
**Purpose**: REST API エンドポイント
**Example**: `src/app/api/clinics/route.ts` - クリニック一覧 API

### Shared Components (`/src/components/`)
**Location**: `src/components/[ComponentName].tsx`
**Purpose**: 再利用可能な UI コンポーネント
**Example**: `MetricsCard.tsx`, `GoalProgressCard.tsx`

### Library & Utilities (`/src/lib/`)
**Location**: `src/lib/[domain].ts`
**Purpose**: ビジネスロジック、外部サービス接続、ユーティリティ
**Example**: `supabase.ts`, `auth.ts`, `jobmedley-scraper.ts`

### Type Definitions (`/src/types/`)
**Location**: `src/types/index.ts`
**Purpose**: 共通の型定義を集約
**Example**: `Clinic`, `DailyMetrics`, `JobType`

### Custom Hooks (`/src/hooks/`)
**Location**: `src/hooks/use[Name].tsx`
**Purpose**: React カスタムフック
**Example**: `useTheme.tsx`

## Naming Conventions

- **Files**: コンポーネントはPascalCase（`MetricsCard.tsx`）、その他はkebab-case（`jobmedley-scraper.ts`）
- **Components**: 機能を表す名詞（`GoalProgressCard`, `ClinicList`）
- **API Routes**: RESTful リソース名（`/api/clinics`, `/api/goals`）

## Import Organization

```typescript
// 外部ライブラリ
import { NextResponse } from 'next/server';

// 内部モジュール（パスエイリアス使用）
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Clinic } from '@/types';

// 相対インポート（同一ディレクトリ内）
import './globals.css';
```

**Path Aliases**:
- `@/*`: `./src/*` にマップ

## Code Organization Principles

- **Server-first**: 可能な限りサーバーコンポーネントで実装し、インタラクティブな部分のみ `'use client'`
- **Colocation**: 関連ファイルは近くに配置（例: ページと専用コンポーネント）
- **Single Responsibility**: 各ファイルは単一の責務を持つ
- **Type Safety**: 共通の型は `src/types/` に集約、ローカルな型は各ファイル内で定義

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
