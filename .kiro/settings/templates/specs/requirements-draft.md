# Requirements Draft - {{FEATURE_NAME}}

> このファイルはGemini CLI/Codex CLIによって作成されたドラフトです。
> Claude Codeでレビュー・修正後、`requirements.md`として確定します。

## 1. Introduction

### 背景
{{BACKGROUND}}

### 概要
{{OVERVIEW}}

### 対象ユーザー
{{TARGET_USERS}}

---

## 2. Requirements

### Requirement 1: {{REQUIREMENT_AREA_1}}
<!-- Requirement headings MUST include a leading numeric ID (e.g., "Requirement 1: ...") -->

**Objective:** As a {{ROLE}}, I want {{CAPABILITY}}, so that {{BENEFIT}}

#### Acceptance Criteria
1. When [event], the system shall [response/action]
2. If [trigger], then the system shall [response/action]
3. While [precondition], the system shall [response/action]
4. Where [feature is included], the system shall [response/action]
5. The system shall [response/action]

### Requirement 2: {{REQUIREMENT_AREA_2}}

**Objective:** As a {{ROLE}}, I want {{CAPABILITY}}, so that {{BENEFIT}}

#### Acceptance Criteria
1. When [event], the system shall [response/action]
2. When [event] and [condition], the system shall [response/action]

<!-- Additional requirements follow the same pattern -->

---

## 3. Technical Investigation

### 調査が必要な事項
- [ ] {{INVESTIGATION_ITEM_1}}
- [ ] {{INVESTIGATION_ITEM_2}}

### 技術的制約
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}

---

## 4. Affected Files

### 変更対象ファイル
| ファイルパス | 変更種別 | 変更概要 |
|-------------|---------|---------|
| `{{FILE_PATH_1}}` | 修正 | {{CHANGE_DESCRIPTION_1}} |
| `{{FILE_PATH_2}}` | 新規作成 | {{CHANGE_DESCRIPTION_2}} |

### 関連ファイル（参照のみ）
- `{{REFERENCE_FILE_1}}`
- `{{REFERENCE_FILE_2}}`

---

## 5. Definition of Done

### 完了条件チェックリスト
- [ ] 全Acceptance Criteriaを満たしている
- [ ] 既存機能に影響がない
- [ ] TypeScriptの型エラーがない
- [ ] ビルドが成功する
- [ ] {{ADDITIONAL_DONE_CRITERIA}}

---

## Draft Metadata

- **作成ツール**: Gemini CLI / Codex CLI
- **作成日**: {{CREATED_DATE}}
- **レビュー状態**: 未レビュー
