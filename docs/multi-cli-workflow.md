# Multi-CLI ワークフロー（アイデア → 実装）

## 目的
- トークン使用量を最小化しつつ、要件品質と実装品質を最大化する
- ざっくりアイデアから、依存関係を考慮した要件定義と実装につなげる

## ルール（必須）
- Phase 0.5 / Phase 1 / Phase 1.5 は **必ず Codex CLI**
- Phase 2（擦り合わせ・最終プラン策定）は **Claude Code / Opus** を優先（上限・不可なら **Codex** にフォールバック）
- Phase 3（実装）は **Claude Code / Sonnet** を最優先（上限・不可なら **Codex** にフォールバック）
- もし上記のモデル指定で動いていない場合は、必ず「このモードで実行できていないので切り替えませんか？」と提案する
- フォールバック時は必ず「Claude Code → Codex へ切替」を宣言する

## 運用の大原則（単一の正）
作業前に必ず最新の以下ファイルを参照し、更新は必ずここへ反映する。
- `.kiro/specs/{feature}/requirements.md`
- `.kiro/specs/{feature}/gap-analysis.md`
- `.kiro/specs/{feature}/design.md`
- `.kiro/specs/{feature}/tasks.md`
- `.kiro/specs/{feature}/spec.json`

## チャットで常に表示する進捗（必須）
開発中は毎回の応答で、以下4点を短く表示する。
1. **最終的な機能一覧（確定版）**
2. **タスク全体像（現在フェーズの全タスク）**
3. **今から取り組むタスク**
4. **直近で完了したタスク**

## ツール選択の判断ルール（簡潔版）
1. Claude Codeが利用可能で、指定モデルで動ける → Claude Code
2. 上限・不可・モデル不一致 → Codexに切替（切替を必ず宣言）

## 成果物
- `idea-brief.md`（アイデア整理）
- `requirements-draft.md` / `gap-analysis-draft.md`（要件ドラフト）
- `wireframe.md` / `ui-mock.html`（視覚確認）
- `requirements.md` / `gap-analysis.md`（確定版）
- `design.md` / `tasks.md` / `spec.json`（設計〜タスク）

## Phase 0.5: アイデア整理（Codex CLI）

**Step 1: ざっくりアイデアを準備**
- 1-3文でOK（対象ユーザー、困りごと、成功の兆し、制約が分かる範囲で）

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
```bash
mkdir -p .kiro/specs/{feature}
# 出力を .kiro/specs/{feature}/idea-brief.md に保存
```

## Phase 1: 要件定義（Codex CLI）

**Step 1: 入力準備**
- 機能名 `{feature}` と概要 `{description}` を確定
- `idea-brief.md` がある場合は必ず参照

**Step 2: 要件ドラフト作成**
```bash
codex "
機能名: {feature}
概要: {description}

以下を参照してEARS形式で詳細な要件を作成:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/settings/templates/specs/requirements-draft.md
- .kiro/settings/templates/specs/gap-analysis-draft.md
- .kiro/specs/{feature}/idea-brief.md（存在する場合）

出力:
- .kiro/specs/{feature}/requirements-draft.md
- .kiro/specs/{feature}/gap-analysis-draft.md

要件内に以下を必ず含める:
- 依存関係や影響範囲（既存機能/データ/UI）
- 依存関係が原因で起きうる制約や注意点
"
```

**Step 3: 出力確認**
```bash
ls -la .kiro/specs/{feature}
```
`requirements-draft.md` と `gap-analysis-draft.md` が作成されていることを確認する。

## Phase 1.5: ワイヤーフレーム確認（Codex CLI）

**保存先**
- `.kiro/specs/{feature}/wireframe.md`（またはASCIIのみなら `wireframe.txt`）
- `.kiro/specs/{feature}/ui-mock.html`（必要時のみ）

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
- 迷う場合のみ次のステップへ

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

## 引き継ぎチェック（チャット/ツール切替時）
切替前に必ず以下を短く整理し、`docs/cc-sdd-progress.md` に1〜3行で記録する。
- 現在フェーズと対象機能（feature名）
- 直近で完了したタスクID
- 今から取り組むタスクID
- 触ったファイルと簡単な変更内容
- 実行したテスト（または未実行）

## Phase 2: 擦り合わせ（Claude Code / Opus）

**Step 1: モデル確認**
- Opusでない場合は「このモードで実行できていないので切り替えませんか？」と提案
- 上限・不可の場合は Codex に切替（切替を必ず宣言）

**Step 2: レビュー依頼**
```bash
claude "
.kiro/specs/{feature}/requirements-draft.md と gap-analysis-draft.md をレビュー。
最新コードとの整合性を確認し、修正後 requirements.md / gap-analysis.md として確定。
"
```

**Step 3: 出力確認**
- `.kiro/specs/{feature}/requirements.md`
- `.kiro/specs/{feature}/gap-analysis.md`

## Phase 3: 設計・実装（Claude Code / Sonnet）

**Step 1: モデル確認**
- Sonnetでない場合は「このモードで実行できていないので切り替えませんか？」と提案
- 上限・不可の場合は Codex に切替（切替を必ず宣言）

**Step 2: 設計**
```bash
/kiro:spec-design {feature}
```

**Step 3: タスク生成**
```bash
/kiro:spec-tasks {feature}
```

**Step 4: 実装**
```bash
/kiro:spec-impl {feature}
```

## 具体例: metrics-manual-input

**Phase 0.5**
```bash
codex "
ざっくりアイデア: 日別メトリクスをカレンダー形式で手動入力したい
追加情報: 対象ユーザーはCS。既存のmetrics集計と整合が必要。

以下を参照して、機能名/概要/依存関係を整理してください:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/specs/

出力要件:
1. 機能名候補を3つ提示（kebab-caseのスラッグも付与）
2. 推奨する機能名を1つ選び、1-2文の概要を書く
3. 依存関係・影響範囲を整理（既存Specとの関係: 関連/依存/衝突の可能性、影響しそうな機能領域/UI/データ）
4. 仮の前提/未確定事項/要確認事項を列挙
5. そのまま .kiro/specs/{feature}/idea-brief.md として保存できるMarkdownで出力
"
```

```bash
mkdir -p .kiro/specs/metrics-manual-input
# 出力を .kiro/specs/metrics-manual-input/idea-brief.md に保存
```

**Phase 1**
```bash
codex "
機能名: metrics-manual-input
概要: カレンダー形式で日別メトリクスを手動入力できるUI

以下を参照してEARS形式で詳細な要件を作成:
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/settings/templates/specs/requirements-draft.md
- .kiro/settings/templates/specs/gap-analysis-draft.md
- .kiro/specs/metrics-manual-input/idea-brief.md

出力:
- .kiro/specs/metrics-manual-input/requirements-draft.md
- .kiro/specs/metrics-manual-input/gap-analysis-draft.md

要件内に以下を必ず含める:
- 依存関係や影響範囲（既存機能/データ/UI）
- 依存関係が原因で起きうる制約や注意点
"
```

**Phase 1.5**
```bash
codex "
機能名: metrics-manual-input
対象: requirements-draft.md / gap-analysis-draft.md

要件から主要画面のワイヤーフレームを作成してください。
出力はテキスト/ASCIIで、情報設計・導線・要素の優先度が分かる形にする。
保存先: .kiro/specs/metrics-manual-input/wireframe.md
"
```

**Phase 2**
```bash
claude "
.kiro/specs/metrics-manual-input/requirements-draft.md と gap-analysis-draft.md をレビュー。
最新コードとの整合性を確認し、修正後 requirements.md / gap-analysis.md として確定。
"
```

**Phase 3**
```bash
/kiro:spec-design metrics-manual-input
/kiro:spec-tasks metrics-manual-input
/kiro:spec-impl metrics-manual-input
```
