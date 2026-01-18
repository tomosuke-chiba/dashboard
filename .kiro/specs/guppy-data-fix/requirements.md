# Requirements Document

## Introduction

GUPPYダッシュボード詳細画面でデータが正しく表示されない問題を修正する。
現在、APIがソース（媒体）でフィルタリングしていないため、GUPPY固有のデータが正しく取得・表示されていない。

### 問題の背景
- GUPPYページ（`/clinic/[slug]/guppy`）でメトリクスデータが「データがありません」と表示される
- API（`/api/clinics/[slug]`）が`source`カラムでフィルタリングしていない
- 結果として、異なる媒体のデータが混在または欠落している

### 期待される表示項目
- 日別データ: 表示数、閲覧数、閲覧率、自社サイト誘導数、応募数
- サマリー: 月間合計値、KPIアラート
- スカウトデータ: 送信数、返信数、返信率、Bitlyクリック数

## Requirements

### Requirement 1: GUPPY専用APIエンドポイントのソースフィルタリング
**Objective:** As a 採用担当者, I want GUPPYページでGUPPY媒体のデータのみを表示したい, so that 正確なGUPPY採用指標を把握できる

#### Acceptance Criteria
1. When GUPPYページがAPIを呼び出す, the ダッシュボードAPI shall `source='guppy'`でmetricsテーブルをフィルタリングする
2. When GUPPYページがスカウトデータを要求する, the ダッシュボードAPI shall `source='guppy'`でscout_messagesテーブルをフィルタリングする
3. When GUPPYページがBitlyデータを要求する, the ダッシュボードAPI shall `source='guppy'`でbitly_linksテーブルをフィルタリングする
4. The ダッシュボードAPI shall GUPPYソース以外のデータをGUPPYページのレスポンスに含めない

### Requirement 2: GUPPY日別メトリクスデータの正確な表示
**Objective:** As a 採用担当者, I want GUPPY媒体の日別アクセスデータを確認したい, so that 日々の採用活動パフォーマンスを追跡できる

#### Acceptance Criteria
1. When GUPPYメトリクスデータが存在する場合, the GUPPYダッシュボード shall 日別テーブルに表示数、閲覧数、閲覧率、自社サイト誘導数、応募数を表示する
2. When 月が選択される, the GUPPYダッシュボード shall 選択月のGUPPYデータのみを表示する
3. When 職種タブが選択される, the GUPPYダッシュボード shall 選択職種のGUPPYデータにフィルタリングする
4. If GUPPYメトリクスデータが存在しない場合, then the GUPPYダッシュボード shall 「データがありません」メッセージを表示する

### Requirement 3: GUPPYサマリーカードの正確な集計
**Objective:** As a 採用担当者, I want GUPPY媒体の月間サマリーを一目で把握したい, so that 月次の採用パフォーマンスを素早く評価できる

#### Acceptance Criteria
1. When GUPPYページが表示される, the GUPPYダッシュボード shall GUPPY媒体のみの表示数合計をサマリーカードに表示する
2. When GUPPYページが表示される, the GUPPYダッシュボード shall GUPPY媒体のみの閲覧数合計と閲覧率をサマリーカードに表示する
3. When GUPPYページが表示される, the GUPPYダッシュボード shall GUPPY媒体のみの自社サイト誘導数と応募数をサマリーカードに表示する
4. If 閲覧率が30%を超える場合, then the GUPPYダッシュボード shall 不正アクセスの可能性を示すアラートを表示する

### Requirement 4: GUPPYスカウトメールデータの表示
**Objective:** As a 採用担当者, I want GUPPYスカウトメールの効果を確認したい, so that スカウト戦略を最適化できる

#### Acceptance Criteria
1. When GUPPYスカウトデータが存在する場合, the GUPPYダッシュボード shall 送信数、返信数、返信率を表示する
2. When GUPPYのBitlyリンクデータが存在する場合, the GUPPYダッシュボード shall クリック数とクリック率を表示する
3. When スカウト文面別のクリックデータが存在する場合, the GUPPYダッシュボード shall リンク別クリック数テーブルにGUPPYソースのみを表示する
4. If GUPPYスカウトデータが存在しない場合, then the GUPPYダッシュボード shall スカウトセクションに0を表示する

### Requirement 5: 利用可能月リストのソース別取得
**Objective:** As a 採用担当者, I want GUPPYデータが存在する月のみを選択したい, so that データのない月を選択して混乱することを避けられる

#### Acceptance Criteria
1. When GUPPYページが読み込まれる, the ダッシュボードAPI shall GUPPY媒体のデータが存在する月のみを利用可能月リストとして返す
2. When 利用可能月リストが空の場合, the GUPPYダッシュボード shall 月選択UIを非表示にし、データがないことを明示する
3. The ダッシュボードAPI shall 利用可能月リストを降順（最新月が先頭）でソートして返す

### Requirement 6: データ取得エラーのハンドリング
**Objective:** As a 採用担当者, I want データ取得に失敗した場合に適切なフィードバックを受けたい, so that 問題の原因を理解し対処できる

#### Acceptance Criteria
1. If APIリクエストが失敗した場合, then the GUPPYダッシュボード shall エラーメッセージを表示する
2. If データベース接続が利用できない場合, then the ダッシュボードAPI shall 503ステータスコードを返す
3. If クリニックが見つからない場合, then the ダッシュボードAPI shall 404ステータスコードを返す
4. While データを読み込み中, the GUPPYダッシュボード shall ローディングインジケータを表示する

## 技術的調査事項

### 確認が必要な項目
1. **metricsテーブルのGUPPYデータ存在確認**: `source='guppy'`のレコードがあるか
2. **sourceカラムの値**: GUPPY媒体のソース識別子が`'guppy'`であることを確認
3. **スクレイピング処理**: GUPPYデータが正しく取得・保存されているか

### 影響範囲
- `/src/app/api/clinics/[slug]/route.ts` - ソースフィルタリング追加
- `/src/app/clinic/[slug]/guppy/page.tsx` - 必要に応じてAPI呼び出し修正

## 完了定義

- [ ] GUPPYページで日別データ（表示数、閲覧数、応募数）が正常に表示される
- [ ] サマリーカードにGUPPY媒体のみの集計値が表示される
- [ ] スカウトメールセクションにGUPPY媒体のデータが表示される
- [ ] 月選択でGUPPYデータのある月のみが選択可能
- [ ] 職種フィルタが正しく動作する
