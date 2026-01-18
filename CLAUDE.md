# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

---

## 現在進行中: ダッシュボード改修プロジェクト (2026-01-18開始)

### 計画ファイル
`~/.claude/plans/smooth-weaving-blanket.md`

### 要件定義書（参照用）
ユーザーが提供した改修要件:
- GUPPY/ジョブメドレー/Quacareerの3媒体対応
- metricsテーブルに3カラム追加（scout_reply_count, interview_count, hire_count）
- 一覧画面: 7項目表示（検索順位、PV、応募数、スカウト送信数、スカウト返信数、面接設定数、採用決定数）
- 詳細画面: GUPPY（データ表示問題修正）、ジョブメドレー（UI重複修正）
- 手動入力機能: カレンダー形式の日別入力UI

### Spec分割と進捗

| Spec名 | 優先度 | 状態 | 次のコマンド |
|--------|--------|------|--------------|
| `guppy-data-fix` | P0 | initialized | `/kiro:spec-requirements guppy-data-fix` |
| `jobmedley-ui-fix` | P0 | 未作成 | `/kiro:spec-init jobmedley-ui-fix` |
| `metrics-manual-input` | P1 | 未作成 | `/kiro:spec-init metrics-manual-input` |
| `clinic-list-enhancement` | P2 | 未作成 | `/kiro:spec-init clinic-list-enhancement` |

### 再開時の手順
1. `/kiro:spec-status guppy-data-fix` で現在のフェーズを確認
2. 上記表の「次のコマンド」を実行
3. 各Specを順番に完了させる

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

---

## Multi-CLI Workflow（コスト最適化）

Claude Codeのリソースを最大化するため、要件定義はCodex CLIに委譲する。

### ワークフロー概要
```
Phase 0.5: Codex CLI → アイデア整理（機能名/概要/依存関係）
Phase 1: Codex CLI → requirements-draft.md, gap-analysis-draft.md
Phase 1.5: Codex CLI → ワイヤーフレーム作成・視覚レビュー（必要時のみHTML/CSSモック）
Phase 2: Claude Code → レビュー・確定 → requirements.md, gap-analysis.md
Phase 3: Claude Code → 設計・実装（通常Kiroフロー）
```

### Phase 0.5: アイデア整理（Codex CLI）

**Step 1: 入力準備**
- ざっくりアイデア（1-3文）
- 対象ユーザー / 現在の困りごと / 成功の兆し / 制約（分かる範囲）

**Step 2: Codexで機能名・概要・依存関係を整理**
```bash
codex "
ざっくりアイデア: {rough_idea}
追加情報: {users_or_constraints}

以下を参照して、機能名/概要/依存関係を整理してください:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/specs/（既存機能の一覧と内容）

出力要件:
1. 機能名候補を3つ提示（kebab-caseのスラッグも付与）
2. 推奨する機能名を1つ選び、1-2文の概要を書く
3. 依存関係・影響範囲を整理（既存Specとの関係: 関連/依存/衝突の可能性、影響しそうな機能領域/UI/データ）
4. 仮の前提/未確定事項/要確認事項を列挙
5. そのまま .kiro/specs/{feature}/idea-brief.md として保存できるMarkdownで出力
"
```

**Step 3: 保存**
- 推奨された機能名を `{feature}` に採用
- `mkdir -p .kiro/specs/{feature}`
- 出力を `.kiro/specs/{feature}/idea-brief.md` として保存

### Phase 1: 要件定義（Codex CLI）

**Step 1: 準備**
- 機能名 `{feature}` と概要 `{description}` を決める
- `idea-brief.md` がある場合は必ず参照する
- 既存のガイドは `.kiro/steering/` を参照

**Step 2: specディレクトリ作成**
```bash
mkdir -p .kiro/specs/{feature}
```

**Step 3: 要件ドラフト作成（Codex）**
```bash
codex "
機能名: {feature}
概要: {description}

以下を参照してEARS形式で詳細な要件を作成:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/settings/templates/specs/requirements-draft.md（テンプレート）
- .kiro/settings/templates/specs/gap-analysis-draft.md（テンプレート）
- .kiro/specs/{feature}/idea-brief.md（存在する場合）

出力:
- .kiro/specs/{feature}/requirements-draft.md
- .kiro/specs/{feature}/gap-analysis-draft.md

要件内に以下を必ず含める:
- 依存関係や影響範囲（既存機能/データ/UI）
- 依存関係が原因で起きうる制約や注意点
"
```

**Step 4: 出力確認**
```bash
ls -la .kiro/specs/{feature}
```
`requirements-draft.md` と `gap-analysis-draft.md` が作成されていることを確認する。

### Phase 1.5: ワイヤーフレーム確認（Codex CLI）

基本はワイヤーフレームで構造を確認し、判定が難しい場合のみHTML/CSSの最小モックを作成する。  
保存先は `.kiro/specs/{feature}/` 配下にまとめる。

**ファイル名ルール**
- `wireframe.md`（またはASCIIのみなら `wireframe.txt`）
- `ui-mock.html`（必要時のみ）

**Step 1: ワイヤーフレーム作成**
```bash
codex "
機能名: {feature}
対象: requirements-draft.md / gap-analysis-draft.md

要件から主要画面のワイヤーフレームを作成してください。
出力はテキスト/ASCIIで、情報設計・導線・要素の優先度が分かる形にする。
保存先: .kiro/specs/{feature}/wireframe.md
"
```

**Step 2: 目視レビュー（あなた）**
- 構造・導線・主要要素の抜け漏れがないか確認
- 迷う箇所があれば次のステップへ

**Step 3: 必要時のみHTML/CSSモック作成**
```bash
codex "
機能名: {feature}
対象: requirements-draft.md / gap-analysis-draft.md

ワイヤーフレームで判断が難しいため、1画面分の最小HTML/CSSモックを作成してください。
雰囲気が既存UIに近い程度でOK。完璧な再現は不要。
保存先: .kiro/specs/{feature}/ui-mock.html
"
```

### Phase 2: 擦り合わせ（Claude Code）

**Step 1: Claude Codeでレビュー依頼**
```bash
claude "
.kiro/specs/{feature}/requirements-draft.md と gap-analysis-draft.md をレビュー。
最新コードとの整合性を確認し、修正後 requirements.md / gap-analysis.md として確定。
"
```

**Step 2: 出力確認**
- `.kiro/specs/{feature}/requirements.md`
- `.kiro/specs/{feature}/gap-analysis.md`

### Phase 3: 設計・実装（Claude Code）

**Step 1: 設計**
```bash
/kiro:spec-design {feature}
```

**Step 2: タスク生成**
```bash
/kiro:spec-tasks {feature}
```

**Step 3: 実装**
```bash
/kiro:spec-impl {feature}
```

### ツール優先順位
1. **Codex CLI**（メイン）

### モデル運用ルール（必須）
- Phase 0.5 / Phase 1 / Phase 1.5 は **必ず Codex CLI** を使う
- Claude Codeでの **擦り合わせ（Phase 2）と最終プラン策定** は **Opus** を使う
- Claude Codeでの **実装（Phase 3）** は **Sonnet** を使う
- もし上記のモデル指定で動いていない場合は、**「このモードで実行できていないので切り替えませんか？」** と必ず提案する
