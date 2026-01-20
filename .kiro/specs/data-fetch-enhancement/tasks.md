# タスク一覧: data-fetch-enhancement

## タスクサマリー
| # | タスク | 優先度 | 見積 | 状態 |
|---|--------|--------|------|------|
| 1 | スクレイパーに日別データ取得追加 | P0 | M | ✅ 完了 |
| 2 | 日別データのDB保存処理追加 | P0 | S | ✅ 完了 |
| 3 | 検索順位の毎日取得を確認 | P0 | S | ✅ 完了 |
| 4 | 動作確認とビルドチェック | P0 | S | ✅ 完了 |
| 5 | GUPPYデータ取得の確認 | P1 | S | ⏸️ 確認待ち |

---

## タスク詳細

### タスク1: スクレイパーに日別データ取得追加
**ファイル**: `src/app/api/scrape/route.ts`

**作業内容**:
1. `scrapeJobMedleyDailyBatch` をインポート
2. JobMedleyスクレイピング処理内で日別データ取得を呼び出し
3. エラーハンドリング追加

**変更箇所**:
```typescript
// インポート追加
import { scrapeJobMedleyDailyBatch } from '@/lib/jobmedley-scraper';
import { saveDailyScrapingResult } from '@/lib/jobmedley-db';

// JobMedley処理内に追加（既存のscrapeJobMedley呼び出し後）
if (jobmedleyResult.analysis) {
  // 既存の分析データ保存処理...

  // 【新規追加】日別データ取得
  try {
    const dailyBatchResult = await scrapeJobMedleyDailyBatch(
      clinic.jobmedley_login_id,
      clinic.jobmedley_password,
      clinic.id,
      clinic.name,
      jstYear,
      jstMonth
    );

    if (dailyBatchResult) {
      const saveResult = await saveDailyScrapingResult(supabase, dailyBatchResult);
      console.log(`JobMedley daily data saved for ${clinic.name}: ${saveResult.metricsCount} records`);
    }
  } catch (dailyError) {
    console.error(`JobMedley daily batch failed for ${clinic.name}:`, dailyError);
    // 日別データ取得失敗でも全体は成功とする
  }
}
```

**完了条件**:
- [ ] `scrapeJobMedleyDailyBatch` が呼び出される
- [ ] 日別データが取得される
- [ ] エラー時は継続処理される

---

### タスク2: 日別データのDB保存処理追加
**ファイル**: `src/app/api/scrape/route.ts`

**作業内容**:
1. `saveDailyScrapingResult` の呼び出し確認
2. ログ出力の追加
3. 保存結果のステータス反映

**完了条件**:
- [ ] `jobmedley_scouts` テーブルにデータがUPSERTされる
- [ ] 保存件数がログ出力される

---

### タスク3: 検索順位の毎日取得を確認
**ファイル**: `src/lib/jobmedley-scraper.ts`, `src/app/api/scrape/route.ts`

**作業内容**:
1. `scrapeJobMedleyDailyBatch` 内で検索順位が取得されることを確認
2. `searchUrls` パラメータの設定確認
3. 検索順位が `jobmedley_scouts.search_rank` に保存されることを確認

**注意事項**:
- `jobmedley_search_url` がクリニックに設定されている必要あり
- 未設定の場合は `search_rank = null` として保存

**完了条件**:
- [ ] 検索順位が日別データに含まれる
- [ ] DBに保存される
- [ ] UIの日別テーブルで表示される

---

### タスク4: 動作確認とビルドチェック
**作業内容**:
1. `npm run build` でビルドエラーなしを確認
2. ローカルで `/api/scrape?source=jobmedley` を実行
3. Supabaseで `jobmedley_scouts` テーブルを確認
4. UIで日別データ表示を確認

**確認項目**:
- [ ] ビルドエラーなし
- [ ] 日別データがDBに保存される
- [ ] UIで日別データが表示される（0ではない値）
- [ ] 検索順位が表示される（設定されている場合）

---

### タスク5: GUPPYデータ取得の確認
**ファイル**: `src/app/api/scrape/route.ts`, `src/app/clinic/[slug]/guppy/page.tsx`

**作業内容**:
1. GUPPYスクレイパーが正常に動作することを確認
2. `source=guppy` フィルタリングが正しく適用されることを確認
3. 日別メトリクスがDBに保存されることを確認

**完了条件**:
- [ ] GUPPYページでデータが表示される
- [ ] 月選択で過去月のデータも表示される

---

## 実行順序

```
タスク1 ─▶ タスク2 ─▶ タスク3 ─▶ タスク4
                                    │
                                    ▼
                               タスク5（並列可能）
```

---

## 注意事項

1. **スクレイピング時間**: 日別データ取得には時間がかかる（各日のホバー操作）
2. **ログイン回数**: 現在は月間サマリーと日別で2回ログインする
3. **検索URL設定**: クリニックに `jobmedley_search_url` が設定されている必要あり
4. **クレデンシャル**: `jobmedley_login_id`, `jobmedley_password` が必須
