/**
 * 職種別スクレイピングテストスクリプト
 * 1クリニックのみで求人ID抽出と職種判定をテスト
 *
 * 使用方法:
 * npx ts-node scripts/test-job-type-scrape.ts
 */

import { chromium } from 'playwright';

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_ACCESS_LOG_URL = 'https://www.guppy.jp/service/access_logs';

// テスト用ログイン情報（津谷歯科医院）
const TEST_LOGIN_ID = '0886556471';
const TEST_PASSWORD = 'r6p6f67x';
const TEST_CLINIC_NAME = '津谷歯科医院';

// 職種タイプ
type JobType = 'dr' | 'dh' | 'da' | 'reception' | 'technician' | 'dietitian' | 'nursery' | 'kindergarten' | 'medical_clerk';

// 求人情報の型定義
interface JobListing {
  id: string;
  name: string;
  jobType: JobType | null;
}

// 求人名から職種を判定するキーワードマップ
const JOB_TYPE_KEYWORDS: { keywords: string[]; jobType: JobType }[] = [
  { keywords: ['歯科医師', '医師', 'ドクター', 'Dr'], jobType: 'dr' },
  { keywords: ['歯科衛生士', '衛生士', 'DH'], jobType: 'dh' },
  { keywords: ['歯科助手', '助手', 'DA', 'アシスタント'], jobType: 'da' },
  { keywords: ['受付', 'レセプション'], jobType: 'reception' },
  { keywords: ['歯科技工士', '技工士'], jobType: 'technician' },
  { keywords: ['管理栄養士', '栄養士'], jobType: 'dietitian' },
  { keywords: ['保育士', '保育'], jobType: 'nursery' },
  { keywords: ['幼稚園教諭', '幼稚園'], jobType: 'kindergarten' },
  { keywords: ['医療事務', '事務'], jobType: 'medical_clerk' },
];

/**
 * 求人名から職種を判定する
 */
function detectJobTypeFromName(jobName: string): JobType | null {
  for (const { keywords, jobType } of JOB_TYPE_KEYWORDS) {
    for (const keyword of keywords) {
      if (jobName.includes(keyword)) {
        return jobType;
      }
    }
  }
  return null;
}

async function testJobTypeScrape() {
  console.log('=== 職種別スクレイピングテスト ===\n');
  console.log(`テストクリニック: ${TEST_CLINIC_NAME}`);

  let browser = null;

  try {
    console.log('\n1. ブラウザを起動中...');
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
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`   ログイン後URL: ${currentUrl}`);

    if (currentUrl.includes('login')) {
      console.error('   ❌ ログイン失敗');
      return;
    }
    console.log('   ✅ ログイン成功');

    // アクセスログページに移動
    console.log('\n3. アクセスログページに移動中...');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const accessLogUrl = `${GUPPY_ACCESS_LOG_URL}/${year}-${month}`;

    await page.goto(accessLogUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log(`   URL: ${page.url()}`);

    // ドロップダウンを探す
    console.log('\n4. ドロップダウンから求人ID一覧を抽出中...');

    // まずページ内の全selectタグを確認
    const selectInfo = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      const info: { name: string; id: string; options: string[] }[] = [];

      selects.forEach((select) => {
        const options: string[] = [];
        select.querySelectorAll('option').forEach((opt) => {
          options.push(opt.textContent?.trim() || '');
        });
        info.push({
          name: select.name || '(no name)',
          id: select.id || '(no id)',
          options,
        });
      });

      return info;
    });

    console.log(`   セレクトボックス数: ${selectInfo.length}`);
    selectInfo.forEach((sel, i) => {
      console.log(`\n   セレクト${i + 1}: name="${sel.name}", id="${sel.id}"`);
      console.log(`   オプション数: ${sel.options.length}`);
      sel.options.forEach((opt, j) => {
        console.log(`     ${j}: ${opt}`);
      });
    });

    // 求人ID抽出
    console.log('\n5. 求人IDを抽出中...');

    const jobListings: JobListing[] = await page.evaluate(() => {
      const select = document.querySelector('select') as HTMLSelectElement | null;
      if (!select) return [];

      const listings: { id: string; name: string; jobType: null }[] = [];
      const options = select.querySelectorAll('option');

      options.forEach((option) => {
        const text = option.textContent?.trim() || '';
        // [1234567] 形式のIDを抽出
        const match = text.match(/\[(\d+)\]/);
        if (match && match[1]) {
          listings.push({
            id: match[1],
            name: text.replace(/\[\d+\]/, '').trim(),
            jobType: null,
          });
        }
      });

      return listings;
    });

    console.log(`   抽出された求人数: ${jobListings.length}`);

    if (jobListings.length === 0) {
      console.log('   ⚠️ 求人が見つかりませんでした');

      // HTMLを保存してデバッグ
      const html = await page.content();
      const fs = require('fs');
      fs.writeFileSync('debug-job-type.html', html);
      console.log('   HTMLをdebug-job-type.htmlに保存しました');

      await page.screenshot({ path: 'debug-job-type.png', fullPage: true });
      console.log('   スクリーンショットをdebug-job-type.pngに保存しました');
      return;
    }

    // 職種判定を追加
    console.log('\n6. 職種を判定中...');
    const jobListingsWithType = jobListings.map((listing) => ({
      ...listing,
      jobType: detectJobTypeFromName(listing.name),
    }));

    console.log('\n   === 求人一覧 ===');
    jobListingsWithType.forEach((listing, i) => {
      const jobTypeLabel = listing.jobType || '不明';
      console.log(`   ${i + 1}. ID: ${listing.id}`);
      console.log(`      名前: ${listing.name}`);
      console.log(`      職種: ${jobTypeLabel}`);
    });

    // 職種ごとの集計
    const jobTypeCounts: Record<string, number> = {};
    jobListingsWithType.forEach((listing) => {
      const key = listing.jobType || 'unknown';
      jobTypeCounts[key] = (jobTypeCounts[key] || 0) + 1;
    });

    console.log('\n   === 職種別集計 ===');
    Object.entries(jobTypeCounts).forEach(([jobType, count]) => {
      console.log(`   ${jobType}: ${count}件`);
    });

    // 1つの求人でアクセスログ取得テスト
    if (jobListingsWithType.length > 0) {
      console.log('\n7. 最初の求人のアクセスログを取得中...');
      const firstJob = jobListingsWithType[0];
      const jobAccessLogUrl = `${GUPPY_ACCESS_LOG_URL}/${year}-${month}/${firstJob.id}`;

      await page.goto(jobAccessLogUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      console.log(`   URL: ${page.url()}`);

      // テーブルデータを抽出
      const tableData = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return [];

        const rows = table.querySelectorAll('tr');
        const results: { date: string; display: string; view: string; redirect: string; application: string }[] = [];

        rows.forEach((row, index) => {
          if (index === 0) return; // ヘッダーをスキップ

          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            results.push({
              date: cells[0]?.textContent?.trim() || '',
              display: cells[1]?.textContent?.trim() || '',
              view: cells[2]?.textContent?.trim() || '',
              redirect: cells[3]?.textContent?.trim() || '',
              application: cells[4]?.textContent?.trim() || '',
            });
          }
        });

        return results;
      });

      console.log(`   取得データ数: ${tableData.length}日分`);
      if (tableData.length > 0) {
        console.log('\n   === 最新5日分のデータ ===');
        tableData.slice(0, 5).forEach((row) => {
          console.log(`   ${row.date}: 表示${row.display}, 閲覧${row.view}, 遷移${row.redirect}, 応募${row.application}`);
        });
      }
    }

    console.log('\n=== テスト完了 ✅ ===');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 実行
testJobTypeScrape();