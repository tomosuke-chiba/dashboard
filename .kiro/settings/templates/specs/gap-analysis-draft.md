# Gap Analysis Draft - {{FEATURE_NAME}}

> このファイルはGemini CLI/Codex CLIによって作成されたドラフトです。
> Claude Codeでレビュー・修正後、`gap-analysis.md`として確定します。

## 1. Current State Analysis

### 現状の実装
{{CURRENT_IMPLEMENTATION_DESCRIPTION}}

### 関連する既存コード
| ファイル | 役割 | 現状の動作 |
|---------|------|-----------|
| `{{FILE_PATH_1}}` | {{ROLE_1}} | {{CURRENT_BEHAVIOR_1}} |
| `{{FILE_PATH_2}}` | {{ROLE_2}} | {{CURRENT_BEHAVIOR_2}} |

---

## 2. Gap Identification

### 機能ギャップ
| # | 現状 | 期待する状態 | ギャップの説明 |
|---|------|-------------|---------------|
| 1 | {{CURRENT_1}} | {{EXPECTED_1}} | {{GAP_DESCRIPTION_1}} |
| 2 | {{CURRENT_2}} | {{EXPECTED_2}} | {{GAP_DESCRIPTION_2}} |

### データギャップ
| # | テーブル/カラム | 現状 | 必要な変更 |
|---|---------------|------|-----------|
| 1 | `{{TABLE_1}}` | {{CURRENT_DATA_1}} | {{REQUIRED_CHANGE_1}} |

### UIギャップ
| # | コンポーネント | 現状 | 必要な変更 |
|---|--------------|------|-----------|
| 1 | `{{COMPONENT_1}}` | {{CURRENT_UI_1}} | {{REQUIRED_UI_CHANGE_1}} |

---

## 3. Root Cause Analysis

### 問題の根本原因
{{ROOT_CAUSE_DESCRIPTION}}

### 影響範囲
- **直接的影響**: {{DIRECT_IMPACT}}
- **間接的影響**: {{INDIRECT_IMPACT}}

---

## 4. Implementation Approach Options

### Option A: {{OPTION_A_NAME}}（推奨）
**概要**: {{OPTION_A_DESCRIPTION}}

**メリット**:
- {{OPTION_A_PROS_1}}
- {{OPTION_A_PROS_2}}

**デメリット**:
- {{OPTION_A_CONS_1}}

**工数**: {{OPTION_A_EFFORT}}
**リスク**: {{OPTION_A_RISK}}

### Option B: {{OPTION_B_NAME}}
**概要**: {{OPTION_B_DESCRIPTION}}

**メリット**:
- {{OPTION_B_PROS_1}}

**デメリット**:
- {{OPTION_B_CONS_1}}

**工数**: {{OPTION_B_EFFORT}}
**リスク**: {{OPTION_B_RISK}}

---

## 5. Recommended Approach

### 推奨オプション
**{{RECOMMENDED_OPTION}}**

### 理由
{{RECOMMENDATION_REASON}}

### 変更対象ファイル
| ファイルパス | 変更種別 | 変更概要 | 優先度 |
|-------------|---------|---------|-------|
| `{{FILE_PATH_1}}` | 修正 | {{CHANGE_1}} | 高 |
| `{{FILE_PATH_2}}` | 修正 | {{CHANGE_2}} | 中 |

---

## 6. Existing Assets

### 再利用可能なコード
- `{{REUSABLE_CODE_1}}`: {{REUSABLE_DESCRIPTION_1}}
- `{{REUSABLE_CODE_2}}`: {{REUSABLE_DESCRIPTION_2}}

### 参考にすべき実装パターン
- `{{PATTERN_FILE_1}}`: {{PATTERN_DESCRIPTION_1}}

---

## Draft Metadata

- **作成ツール**: Gemini CLI / Codex CLI
- **作成日**: {{CREATED_DATE}}
- **レビュー状態**: 未レビュー
