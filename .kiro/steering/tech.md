# Technology Stack

## Architecture

Next.js App Router ベースの SPA/SSR ハイブリッドアーキテクチャ。サーバーサイドでデータ取得を行い、クライアントサイドでインタラクティブな UI を提供。

## Core Technologies

- **Language**: TypeScript 5.x (strict mode)
- **Framework**: Next.js 16.x (App Router)
- **Runtime**: Node.js 20+
- **React**: 19.x

## Key Libraries

- **Database**: Supabase（PostgreSQL + クライアント SDK）
- **Authentication**: jose (JWT), bcryptjs（パスワードハッシュ）
- **Scraping**: Playwright（ヘッドレスブラウザ自動化）
- **Charts**: Recharts（データ可視化）
- **Date**: date-fns, date-fns-tz（日付操作）

## Development Standards

### Type Safety
- TypeScript strict mode 有効
- 型定義は `src/types/index.ts` に集約
- `@/*` パスエイリアスで絶対インポート

### Code Quality
- ESLint + eslint-config-next
- Tailwind CSS v4 でスタイリング

### Testing
- 現状テストフレームワーク未導入

## Development Environment

### Required Tools
- Node.js 20+
- npm / yarn / pnpm / bun

### Common Commands
```bash
# Dev: npm run dev
# Build: npm run build
# Lint: npm run lint
```

## Key Technical Decisions

- **App Router採用**: Next.js 16のApp Routerでサーバーコンポーネント活用
- **Supabase**: BaaS利用でバックエンド開発を簡略化
- **Playwright**: 採用媒体からのデータ自動取得に使用
- **JWT認証**: サーバーレス環境に適した認証方式（現在は無効化中）

---
_Document standards and patterns, not every dependency_
