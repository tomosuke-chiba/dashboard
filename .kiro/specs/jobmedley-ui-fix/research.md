# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `jobmedley-ui-fix`
- **Discovery Scope**: Extension
- **Key Findings**:
  - 既存UIは `src/app/clinic/[slug]/job-medley/page.tsx` の単一ページで構成され、重複表示は同一ページ内の描画経路に起因する可能性が高い。
  - 新規依存ライブラリは不要で、既存のNext.js/React構成の範囲で修正可能。
  - ローディング/エラー表示の統一は、状態分岐をページ上部に集約するだけで実現できる。

## Research Log

### JobMedleyページの構成調査
- **Context**: 詳細画面でUIが重複する報告があり、該当ページ構造を確認する必要がある。
- **Sources Consulted**: `src/app/clinic/[slug]/job-medley/page.tsx`
- **Findings**:
  - 単一のページコンポーネント内に複数のセクションが順に描画されている。
  - サマリー/分析セクションは条件分岐による表示切替がある。
  - ローディング/エラーの表示は別途状態を持つ設計。
- **Implications**: 同一セクションが複数回描画される経路がないか、条件分岐の整理が必要。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| UI構成の単一描画パス維持 | 既存のページコンポーネントを整理して重複を排除 | 影響範囲が最小 | 状態分岐の整理漏れで再発の可能性 | 既存構成を踏襲 | 
| セクション分割の小コンポーネント化 | セクションごとにコンポーネントを切り出して責務分離 | 再利用性向上 | 作業量増、差分が大きくなる | 必要最低限で採用検討 |

## Design Decisions

### Decision: 単一描画パスの維持
- **Context**: UI重複は既存ページの描画順・条件分岐の整理で解消できる可能性が高い。
- **Alternatives Considered**:
  1. セクションを全面的にコンポーネント分割して再構成
  2. 既存ページ内で重複経路を整理して単一描画パスに統合
- **Selected Approach**: 既存ページ内で条件分岐を整理し、同一セクションが1回のみ描画されるように統合する。
- **Rationale**: 影響範囲が最小で、既存挙動を維持しやすい。
- **Trade-offs**: 長期的な可読性改善は限定的。
- **Follow-up**: 変更後にローディング/エラー表示の二重描画が発生していないかを確認する。

## Risks & Mitigations
- 重複の原因が複数箇所に分散している可能性 — 描画順と条件分岐を段階的に確認する。
- 既存機能の表示欠落 — 受け入れ条件に沿って表示確認を実施する。

## References
- `src/app/clinic/[slug]/job-medley/page.tsx` — 既存UI構成の確認
