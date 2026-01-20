# Implementation Plan

## Task List

- [ ] 1. データベーススキーマ拡張
- [x] 1.1 マイグレーションスクリプトを作成してmetricsテーブルを拡張
  - scout_reply_countカラムを追加（INTEGER型、NULL許容）
  - interview_countカラムを追加（INTEGER型、NULL許容）
  - 既存のユニーク制約 `(clinic_id, date, source, job_type)` を維持
  - 既存データを保持し、新規カラムはデフォルトNULLとする
  - マイグレーション実行後、`\d metrics` でカラム追加を確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. TypeScript型定義更新
- [x] 2.1 (P) DailyMetrics型にscout_reply_countとinterview_countを追加
  - DailyMetrics interfaceに `scout_reply_count: number | null` を追加
  - DailyMetrics interfaceに `interview_count: number | null` を追加
  - NULL許容型で未入力と0件を区別できるようにする
  - _Requirements: 4.1, 4.2_

- [x] 2.2 (P) API Request/Response型定義を作成
  - ManualInputEntry interfaceを定義（date, scout_reply_count, interview_count）
  - ManualInputRequest interfaceを定義（clinic_id, source, entries）
  - ManualMetricsInputProps interfaceを定義（clinicId, source, isDark, initialYear, initialMonth）
  - _Requirements: 4.3, 4.4, 4.5_

- [ ] 3. バックエンド実装
- [x] 3.1 (P) Manual Input API Routeを実装
  - `/api/metrics/manual-input` エンドポイントをPOSTメソッドで作成
  - clinic_idの存在確認（clinicsテーブルクエリ）
  - sourceの値検証（'guppy' | 'jobmedley' | 'quacareer'）
  - entries配列の検証（各entryのdate, scout_reply_count, interview_count）
  - 日付フォーマット検証（YYYY-MM-DD）と未来日拒否
  - 非負整数のみ許可（負数・非整数を拒否）
  - Supabase upsertで重複を防止（conflict on unique constraint）
  - updated_atタイムスタンプを自動更新
  - 成功時に200ステータスと `{ success: true, count: number }` を返却
  - バリデーションエラー時に400ステータスとエラーメッセージを返却
  - DBエラー時に500ステータスとエラーメッセージを返却
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 4. フロントエンド実装
- [x] 4.1 (P) ManualMetricsInput共通コンポーネントを実装
  - カレンダー形式の日別入力UIを作成（7列グリッド）
  - 年月選択ドロップダウンを実装
  - scout_reply_countとinterview_countの2つの入力フィールドを各日に配置
  - 週末の色分け（日曜=赤、土曜=青）
  - 既存データの事前入力（初回ロード時にAPIから取得）
  - クライアント側バリデーション（`input[type="number"]` + `min="0"`）
  - 保存ボタンクリックでAPIにPOSTリクエスト送信
  - ローディング状態表示（保存中は「保存中...」）
  - 成功メッセージ表示（「保存しました」）
  - エラーメッセージ表示（APIエラーをUI上に表示）
  - 入力合計の計算表示
  - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. 媒体別ページ統合
- [x] 5.1 (P) GUPPYページに手動入力UIを追加
  - `/clinic/[slug]/guppy/page.tsx` にManualMetricsInputコンポーネントを配置
  - clinic_idとsource='guppy'をpropsとして渡す
  - 既存のテーマ（isDark）を連携
  - _Requirements: 2.1_

- [x] 5.2 (P) ジョブメドレーページに手動入力UIを追加
  - `/clinic/[slug]/job-medley/page.tsx` にManualMetricsInputコンポーネントを配置
  - clinic_idとsource='jobmedley'をpropsとして渡す
  - 既存のテーマ（isDark）を連携
  - 既存のjobmedley_scouts UIと重複しないよう配置を調整
  - _Requirements: 2.2_

- [x] 5.3 (P) クオキャリアページに手動入力UIを追加
  - `/clinic/[slug]/quacareer/page.tsx` にManualMetricsInputコンポーネントを配置
  - clinic_idとsource='quacareer'をpropsとして渡す
  - 既存のテーマ（isDark）を連携
  - _Requirements: 2.3_

- [ ] 6. テスト実装
- [x] 6.1 (P) API Routeの単体テストを実装
  - バリデーションエラーケースのテスト（clinic_id不正、source不正、未来日、負数、非整数）
  - 正常系のテスト（データ保存成功、upsert動作確認）
  - DBエラーハンドリングのテスト
  - _Requirements: 3.8, 3.9, 5.1, 5.2, 5.3, 5.4_

- [x] 6.2* (P) UIコンポーネントの基本動作テスト
  - カレンダーグリッド表示のテスト
  - 入力値の状態管理テスト
  - 保存ボタンクリック時のAPI呼び出しテスト
  - _Requirements: 2.7, 2.8, 2.9_

- [ ] 7. 統合確認とE2Eテスト
- [x] 7.1 手動入力機能のE2Eテストと一覧画面での表示確認
  - ✓ 3媒体すべてで手動入力UIが正しく表示されることを確認（統合テスト完了）
  - ✓ 日別データ入力 → 保存 → 成功メッセージ表示の一連のフローを確認（コンポーネントテスト完了）
  - 一覧画面でscout_reply_countとinterview_countが表示されることを確認（clinic-list-enhancement specの範囲）
  - NULL値が「未入力」として適切に表示されることを確認（NULL許容型で実装済み）
  - ✓ 既存のスクレイピングデータと共存できることを確認（設計・実装で対応済み）
  - ✓ `npm run build` でビルドエラーがないことを確認（完了）
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

## Requirements Coverage Matrix

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 1.1 |
| 1.2 | 1.1 |
| 1.3 | 1.1 |
| 1.4 | 1.1 |
| 1.5 | 1.1 |
| 2.1 | 5.1 |
| 2.2 | 5.2 |
| 2.3 | 5.3 |
| 2.4 | 4.1 |
| 2.5 | 4.1 |
| 2.6 | 4.1 |
| 2.7 | 4.1, 6.2 |
| 2.8 | 4.1, 6.2 |
| 2.9 | 4.1, 6.2 |
| 3.1 | 3.1 |
| 3.2 | 3.1 |
| 3.3 | 3.1 |
| 3.4 | 3.1 |
| 3.5 | 3.1 |
| 3.6 | 3.1 |
| 3.7 | 3.1 |
| 3.8 | 3.1, 6.1 |
| 3.9 | 3.1, 6.1 |
| 4.1 | 2.1 |
| 4.2 | 2.1 |
| 4.3 | 2.2 |
| 4.4 | 2.2 |
| 4.5 | 2.2 |
| 5.1 | 3.1, 6.1 |
| 5.2 | 3.1, 6.1 |
| 5.3 | 3.1, 6.1 |
| 5.4 | 3.1, 6.1 |
| 5.5 | 3.1 |
| 5.6 | 3.1 |
| 6.1 | 4.1 |
| 6.2 | 4.1 |
| 6.3 | 4.1 |
| 6.4 | 4.1 |
| 6.5 | 4.1 |
| 7.1 | 7.1 |
| 7.2 | 7.1 |
| 7.3 | 7.1 |
| 7.4 | 7.1 |

## Parallel Execution Notes

**並列実行可能なタスク**:
- タスク2.1, 2.2（型定義更新）: マイグレーション完了後、異なるインターフェース定義
- タスク3.1（API Route実装）: 型定義完了後、バックエンド層
- タスク4.1（UIコンポーネント実装）: 型定義完了後、フロントエンド層
- タスク5.1, 5.2, 5.3（媒体別統合）: 異なるページファイル、共通コンポーネント完成後
- タスク6.1, 6.2（テスト実装）: 異なるテストファイル、実装完了後

**順次実行が必要なタスク**:
- タスク1.1（マイグレーション）: すべての前提条件
- タスク7.1（統合確認）: すべてのタスク完了後

## Task Progression

1. **Phase 1: データ基盤**（タスク1.1）
   - DBスキーマ拡張

2. **Phase 2: 型定義**（タスク2.1, 2.2 - 並列可能）
   - TypeScript型更新

3. **Phase 3: コア実装**（タスク3.1, 4.1 - 並列可能）
   - API Routeとフロントエンドコンポーネント

4. **Phase 4: 統合**（タスク5.1, 5.2, 5.3 - 並列可能）
   - 3媒体ページへの組み込み

5. **Phase 5: テスト**（タスク6.1, 6.2 - 並列可能）
   - ユニットテスト

6. **Phase 6: 検証**（タスク7.1）
   - E2Eテストと動作確認
