# Implementation Plan

## ツール振り分けラベル

各タスクに以下のラベルを付与すること:

| ラベル | 担当ツール | 適用基準 |
|--------|-----------|----------|
| `[AG]` | Antigravity | 外部API連携、クラウド連携、リアルタイム、UI/UX |
| `[CC]` | Claude Code | ビジネスロジック、アルゴリズム、ドキュメント、テスト |
| `[BOTH]` | 両方 | 統合テスト、クロスレビューが必要な箇所 |

## Task Format Template

Use whichever pattern fits the work breakdown:

### Major task only
- [ ] {{NUMBER}}. [{{TOOL_LABEL}}] {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}} *(Include details only when needed. If the task stands alone, omit bullet items.)*
  - _Requirements: {{REQUIREMENT_IDS}}_

### Major + Sub-task structure
- [ ] {{MAJOR_NUMBER}}. [{{TOOL_LABEL}}] {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{SUB_PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{DETAIL_ITEM_2}}
  - _Requirements: {{REQUIREMENT_IDS}}_ *(IDs only; do not add descriptions or parentheses.)*

> **Tool label**: Each task MUST have a tool label (`[AG]`, `[CC]`, or `[BOTH]`) to indicate which tool is responsible for implementation.
>
> **Parallel marker**: Append ` (P)` only to tasks that can be executed in parallel. Omit the marker when running in `--sequential` mode.
>
> **Optional test coverage**: When a sub-task is deferrable test work tied to acceptance criteria, mark the checkbox as `- [ ]*` and explain the referenced requirements in the detail bullets.

## 振り分け例

```markdown
- [ ] 1. [AG] Supabase認証セットアップ
  - OAuth連携（Google, GitHub）
  - リアルタイムセッション管理
  - _Requirements: REQ-1, REQ-2_

- [ ] 2. [CC] 認証ミドルウェア実装
  - JWTトークン検証ロジック
  - 権限チェック処理
  - _Requirements: REQ-3_

- [ ] 3. [AG] ダッシュボードUI (P)
  - リアルタイムデータ表示
  - グラフ/チャート連携
  - _Requirements: REQ-4, REQ-5_

- [ ] 4. [CC] データ集計ロジック (P)
  - 複雑な集計クエリ
  - キャッシュ戦略
  - _Requirements: REQ-6_

- [ ] 5. [BOTH] 統合テスト
  - Antigravity: E2Eテスト（ブラウザ）
  - Claude Code: ユニットテスト（ロジック）
  - _Requirements: REQ-7_
```
