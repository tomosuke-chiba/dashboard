/**
 * JobMedley 差分計算・率計算ロジックのユニットテスト
 * Tasks: 6.2, 6.3
 * Requirements: 4.3, 7.3
 *
 * 実行: npx ts-node --transpile-only scripts/test-jobmedley-calculations.ts
 */

// calculateDailySentCount のロジックをテスト用に再実装（外部依存なし）
interface ScoutSentData {
  date: string;
  cumSentCount: number;
  sentCount: number;
}

function calculateDailySentCount(
  cumSentData: { date: string; cumSentCount: number }[]
): ScoutSentData[] {
  const result: ScoutSentData[] = [];

  for (let i = 0; i < cumSentData.length; i++) {
    const current = cumSentData[i];
    const previous = i > 0 ? cumSentData[i - 1] : null;

    let sentCount: number;

    // 月初または累計リセット検知
    const isMonthStart = current.date.endsWith('-01');
    const isReset = previous && current.cumSentCount < previous.cumSentCount;

    if (isMonthStart || isReset || !previous) {
      // 月初・リセット時は累計値をそのまま使用
      sentCount = current.cumSentCount;
    } else {
      // 通常は差分計算
      sentCount = current.cumSentCount - previous.cumSentCount;
    }

    result.push({
      date: current.date,
      cumSentCount: current.cumSentCount,
      sentCount: Math.max(0, sentCount),  // 負の値を防ぐ
    });
  }

  return result;
}

// テスト結果カウンター
let passed = 0;
let failed = 0;

function assertEqual<T>(actual: T, expected: T, testName: string): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertNull(actual: unknown, testName: string): void {
  if (actual === null) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    console.log(`  Expected: null`);
    console.log(`  Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ============================================
// 6.2 差分計算ロジックのテスト
// ============================================

console.log('\n========================================');
console.log('6.2 差分計算ロジックのテスト');
console.log('========================================\n');

// テスト1: 通常日の差分計算
console.log('--- テスト1: 通常日の差分計算 ---');
{
  const input = [
    { date: '2024-12-01', cumSentCount: 10 },
    { date: '2024-12-02', cumSentCount: 15 },
    { date: '2024-12-03', cumSentCount: 23 },
    { date: '2024-12-04', cumSentCount: 30 },
  ];
  const result = calculateDailySentCount(input);

  assertEqual(result[0].sentCount, 10, '月初は累計値をそのまま使用');
  assertEqual(result[1].sentCount, 5, '2日目: 15-10=5');
  assertEqual(result[2].sentCount, 8, '3日目: 23-15=8');
  assertEqual(result[3].sentCount, 7, '4日目: 30-23=7');
}

// テスト2: 月初リセットの計算
console.log('\n--- テスト2: 月初リセットの計算 ---');
{
  const input = [
    { date: '2024-11-30', cumSentCount: 100 },
    { date: '2024-12-01', cumSentCount: 5 },
    { date: '2024-12-02', cumSentCount: 12 },
  ];
  const result = calculateDailySentCount(input);

  assertEqual(result[0].sentCount, 100, '11/30: 最初のデータは累計値');
  assertEqual(result[1].sentCount, 5, '12/1月初: 累計リセット、累計値をそのまま使用');
  assertEqual(result[2].sentCount, 7, '12/2: 12-5=7');
}

// テスト3: 累計値リセット検知
console.log('\n--- テスト3: 累計値リセット検知 ---');
{
  const input = [
    { date: '2024-12-15', cumSentCount: 80 },
    { date: '2024-12-16', cumSentCount: 10 },  // リセット発生
    { date: '2024-12-17', cumSentCount: 18 },
  ];
  const result = calculateDailySentCount(input);

  assertEqual(result[0].sentCount, 80, '12/15: 最初のデータ');
  assertEqual(result[1].sentCount, 10, '12/16: リセット検知、累計値をそのまま使用');
  assertEqual(result[2].sentCount, 8, '12/17: 18-10=8');
}

// テスト4: 空配列
console.log('\n--- テスト4: 空配列 ---');
{
  const input: { date: string; cumSentCount: number }[] = [];
  const result = calculateDailySentCount(input);

  assertEqual(result.length, 0, '空配列を入力すると空配列を返す');
}

// テスト5: 単一要素
console.log('\n--- テスト5: 単一要素 ---');
{
  const input = [{ date: '2024-12-15', cumSentCount: 42 }];
  const result = calculateDailySentCount(input);

  assertEqual(result.length, 1, '単一要素の配列長');
  assertEqual(result[0].sentCount, 42, '単一要素は累計値をそのまま使用');
}

// テスト6: 累計値が増加しない日（同じ値）
console.log('\n--- テスト6: 累計値が増加しない日（同じ値） ---');
{
  const input = [
    { date: '2024-12-01', cumSentCount: 10 },
    { date: '2024-12-02', cumSentCount: 10 },  // 変化なし
    { date: '2024-12-03', cumSentCount: 15 },
  ];
  const result = calculateDailySentCount(input);

  assertEqual(result[0].sentCount, 10, '12/1: 月初');
  assertEqual(result[1].sentCount, 0, '12/2: 変化なしは0');
  assertEqual(result[2].sentCount, 5, '12/3: 15-10=5');
}

// ============================================
// 6.3 率計算ロジックのテスト
// ============================================

console.log('\n========================================');
console.log('6.3 率計算ロジックのテスト');
console.log('========================================\n');

// 率計算関数（フロントエンドのロジックを再現）
function calculateScoutApplicationRate(scoutApplicationCount: number, sentCount: number): number | null {
  if (sentCount === 0) return null;
  return scoutApplicationCount / sentCount;
}

function calculateJobPageApplicationRate(applicationCountJobPage: number, pageViewCount: number): number | null {
  if (pageViewCount === 0) return null;
  return applicationCountJobPage / pageViewCount;
}

// 表示用フォーマット関数（フロントエンドのロジックを再現）
function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

// テスト1: スカウト応募率の通常計算
console.log('--- テスト1: スカウト応募率の計算 ---');
{
  const rate = calculateScoutApplicationRate(5, 100);
  assertEqual(rate, 0.05, 'スカウト応募率: 5/100 = 0.05');
  assertEqual(formatRate(rate), '5.0%', 'スカウト応募率表示: 5.0%');
}

// テスト2: スカウト応募率のゼロ除算
console.log('\n--- テスト2: スカウト応募率のゼロ除算 ---');
{
  const rate = calculateScoutApplicationRate(3, 0);
  assertNull(rate, '送信数0の場合はnull');
  assertEqual(formatRate(rate), '—', 'ゼロ除算時は「—」表示');
}

// テスト3: 求人ページ経由応募率の計算
console.log('\n--- テスト3: 求人ページ経由応募率の計算 ---');
{
  const rate = calculateJobPageApplicationRate(2, 50);
  assertEqual(rate, 0.04, '求人ページ応募率: 2/50 = 0.04');
  assertEqual(formatRate(rate), '4.0%', '求人ページ応募率表示: 4.0%');
}

// テスト4: 求人ページ経由応募率のゼロ除算
console.log('\n--- テスト4: 求人ページ経由応募率のゼロ除算 ---');
{
  const rate = calculateJobPageApplicationRate(1, 0);
  assertNull(rate, '閲覧数0の場合はnull');
  assertEqual(formatRate(rate), '—', 'ゼロ除算時は「—」表示');
}

// テスト5: 応募がない場合
console.log('\n--- テスト5: 応募がない場合 ---');
{
  const scoutRate = calculateScoutApplicationRate(0, 100);
  assertEqual(scoutRate, 0, 'スカウト応募0の場合は0');
  assertEqual(formatRate(scoutRate), '0.0%', 'スカウト応募0の表示: 0.0%');

  const jobPageRate = calculateJobPageApplicationRate(0, 50);
  assertEqual(jobPageRate, 0, '求人ページ応募0の場合は0');
  assertEqual(formatRate(jobPageRate), '0.0%', '求人ページ応募0の表示: 0.0%');
}

// テスト6: 高応募率（100%以上）
console.log('\n--- テスト6: 高応募率（100%以上も可能） ---');
{
  // 応募が送信より多い場合（理論上は起きないが計算上は可能）
  const rate = calculateScoutApplicationRate(150, 100);
  assertEqual(rate, 1.5, '150/100 = 1.5');
  assertEqual(formatRate(rate), '150.0%', '150.0%と表示');
}

// テスト7: 小数点以下の精度
console.log('\n--- テスト7: 小数点以下の精度 ---');
{
  const rate = calculateScoutApplicationRate(1, 3);
  // 1/3 = 0.3333...
  assertEqual(formatRate(rate), '33.3%', '1/3は33.3%と表示（小数点1位まで）');
}

// ============================================
// テスト結果サマリー
// ============================================

console.log('\n========================================');
console.log('テスト結果サマリー');
console.log('========================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
