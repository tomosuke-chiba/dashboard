/**
 * スカウトメール送信数を日別に取得するスクリプト
 *
 * スカウトメモの形式: "1226 DH スカウト" → 12/26にDHに1通送信
 *
 * 使用方法:
 * npx ts-node scripts/test-scout-scrape.ts
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_MESSAGE_THREAD_URL = 'https://www.guppy.jp/service/message_thread';

// テスト用ログイン情報（津谷歯科医院）
const TEST_LOGIN_ID = '0886556471';
const TEST_PASSWORD = 'r6p6f67x';

// 職種マッピング
const JOB_TYPE_MAP: Record<string, string> = {
  'DH': 'dh',
  'DR': 'dr',
  'DA': 'da',
  '歯科衛生士': 'dh',
  '歯科医師': 'dr',
  '歯科助手': 'da',
};

interface ScoutEntry {
  date: string;       // YYYY-MM-DD形式
  jobType: string | null;
  memo: string;
}

interface DailyScoutCount {
  date: string;
  sentCount: number;
  jobTypeCounts: Record<string, number>;
}

/**
 * スカウトメモから日付と職種を抽出
 * 形式: "1226 DH スカウト" → { date: "2024-12-26", jobType: "dh" }
 */
function parseScoutMemo(memo: string, createdDate: string): ScoutEntry | null {
  // createdDateは "2025.12.26" 形式
  const year = createdDate.split('.')[0];

  // メモの先頭4桁が日付 (MMDD形式)
  const dateMatch = memo.match(/^(\d{4})/);
  if (!dateMatch) return null;

  const mmdd = dateMatch[1];
  const month = mmdd.substring(0, 2);
  const day = mmdd.substring(2, 4);
  const date = `${year}-${month}-${day}`;

  // 職種を抽出
  let jobType: string | null = null;
  for (const [key, value] of Object.entries(JOB_TYPE_MAP)) {
    if (memo.toUpperCase().includes(key.toUpperCase())) {
      jobType = value;
      break;
    }
  }

  return { date, jobType, memo };
}

async function testScoutScrape() {
  console.log('=== スカウトメール送信数 取得スクリプト ===\n');

  let browser = null;

  try {
    console.log('1. ブラウザを起動中...');
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    console.log('2. ログイン中...');
    await page.goto(GUPPY_LOGIN_URL, { waitUntil: 'networkidle' });
    await page.fill('input[name="data[Account][login_id]"]', TEST_LOGIN_ID);
    await page.fill('input[name="data[Account][password]"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`   ログイン後URL: ${currentUrl}`);

    if (currentUrl.includes('login')) {
      console.error('   ❌ ログイン失敗');
      return;
    }
    console.log('   ✅ ログイン成功');

    // スカウト未返信ページに移動
    console.log('\n3. スカウト未返信ページに移動...');
    await page.goto(`${GUPPY_MESSAGE_THREAD_URL}?filter_tab=scout_no_reply`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 「もっと見る」ボタンをクリックして全件表示
    console.log('\n4. 全件読み込み中...');
    let loadMoreCount = 0;
    while (true) {
      const loadMoreButton = await page.$('a.mod-button:has-text("もっと見る"), button:has-text("もっと見る")');
      if (loadMoreButton) {
        await loadMoreButton.click();
        await page.waitForTimeout(1000);
        loadMoreCount++;
        console.log(`   ${loadMoreCount}回目の「もっと見る」をクリック`);
      } else {
        break;
      }
    }

    // スカウトメモを抽出
    console.log('\n5. スカウトメモを抽出中...');
    const scoutMemos = await page.evaluate(() => {
      const memos: { memo: string; created: string }[] = [];

      // scout-memo-list内のメモを取得
      const memoLists = document.querySelectorAll('.scout-memo-list');
      memoLists.forEach((list) => {
        const items = list.querySelectorAll('li.list-memo-body');
        items.forEach((item) => {
          const memoText = item.childNodes[0]?.textContent?.trim() || '';
          const createdSpan = item.querySelector('.list-memo-created');
          const created = createdSpan?.textContent?.trim() || '';

          if (memoText && created) {
            memos.push({ memo: memoText, created });
          }
        });
      });

      return memos;
    });

    console.log(`   抽出されたメモ数: ${scoutMemos.length}件`);

    // メモをパースして日別に集計
    const scoutEntries: ScoutEntry[] = [];
    for (const { memo, created } of scoutMemos) {
      const entry = parseScoutMemo(memo, created);
      if (entry && memo.includes('スカウト')) {
        scoutEntries.push(entry);
      }
    }

    console.log(`   スカウトエントリ数: ${scoutEntries.length}件`);

    // 日別に集計
    const dailyCounts = new Map<string, DailyScoutCount>();
    for (const entry of scoutEntries) {
      const existing = dailyCounts.get(entry.date) || {
        date: entry.date,
        sentCount: 0,
        jobTypeCounts: {},
      };

      existing.sentCount++;
      if (entry.jobType) {
        existing.jobTypeCounts[entry.jobType] = (existing.jobTypeCounts[entry.jobType] || 0) + 1;
      }

      dailyCounts.set(entry.date, existing);
    }

    // 結果を表示
    console.log('\n=== 日別スカウト送信数 ===');
    const sortedDates = Array.from(dailyCounts.keys()).sort().reverse();

    for (const date of sortedDates) {
      const data = dailyCounts.get(date)!;
      const jobTypes = Object.entries(data.jobTypeCounts)
        .map(([type, count]) => `${type}:${count}`)
        .join(', ');
      console.log(`${date}: ${data.sentCount}通 (${jobTypes || '職種不明'})`);
    }

    // 月別サマリー
    console.log('\n=== 月別サマリー ===');
    const monthlyCounts = new Map<string, number>();
    for (const entry of scoutEntries) {
      const month = entry.date.substring(0, 7); // YYYY-MM
      monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1);
    }

    const sortedMonths = Array.from(monthlyCounts.keys()).sort().reverse();
    for (const month of sortedMonths) {
      console.log(`${month}: ${monthlyCounts.get(month)}通`);
    }

    // サンプルデータを表示
    console.log('\n=== サンプルメモ（最初の10件） ===');
    scoutMemos.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. "${m.memo}" (${m.created})`);
    });

    console.log('\n=== テスト完了 ===');

    // 返り値として使えるデータを返す
    return {
      totalSent: scoutEntries.length,
      dailyCounts: Array.from(dailyCounts.values()),
      monthlyCounts: Object.fromEntries(monthlyCounts),
    };

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScoutScrape();