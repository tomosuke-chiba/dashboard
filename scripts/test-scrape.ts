/**
 * GUPPYスクレイピングテストスクリプト v2
 *
 * 使用方法:
 * node scripts/test-scrape.ts
 */

const { chromium } = require('playwright');
const fs = require('fs');

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_ACCESS_LOG_URL = 'https://www.guppy.jp/service/access_logs';
const GUPPY_APPLICANTS_URL = 'https://www.guppy.jp/service/applicants';

// テスト用ログイン情報
const TEST_LOGIN_ID = '0886556471';
const TEST_PASSWORD = 'r6p6f67x';

async function testGuppyScrape() {
  console.log('=== GUPPYスクレイピングテスト v2 ===\n');

  const isDebug = process.env.DEBUG === 'true';
  let browser = null;

  try {
    console.log('1. ブラウザを起動中...');
    browser = await chromium.launch({
      headless: !isDebug,
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

    console.log(`   ログイン後URL: ${page.url()}`);

    // アクセスログページに移動
    console.log('\n3. アクセスログページに移動中...');
    await page.goto(GUPPY_ACCESS_LOG_URL, { waitUntil: 'networkidle' });
    console.log(`   URL: ${page.url()}`);

    await page.screenshot({ path: 'debug-access-logs.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-access-logs.png');

    // HTMLを保存
    const accessHtml = await page.content();
    fs.writeFileSync('debug-access-logs.html', accessHtml);
    console.log('   HTML保存: debug-access-logs.html');

    // テーブルデータを探す
    console.log('\n4. アクセスデータを抽出中...');

    // テーブルからデータを取得
    const tableData = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const results: string[][] = [];

      tables.forEach((table, i) => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('th, td');
          const rowData: string[] = [];
          cells.forEach(cell => {
            rowData.push((cell as HTMLElement).innerText.trim());
          });
          if (rowData.length > 0) {
            results.push(rowData);
          }
        });
      });

      return results;
    });

    console.log('   見つかったテーブルデータ:');
    tableData.forEach((row: string[], i: number) => {
      console.log(`   ${i}: ${row.join(' | ')}`);
    });

    // 数値を探す
    const bodyText = await page.textContent('body');

    // 総閲覧数のパターン
    const totalPvMatch = bodyText?.match(/総閲覧[数：:\s]*([0-9,]+)/);
    const totalAccessMatch = bodyText?.match(/総アクセス[数：:\s]*([0-9,]+)/);

    if (totalPvMatch) console.log(`\n   総閲覧数: ${totalPvMatch[1]}`);
    if (totalAccessMatch) console.log(`   総アクセス数: ${totalAccessMatch[1]}`);

    // 応募者管理ページに移動
    console.log('\n5. 応募者管理ページに移動中...');
    await page.goto(GUPPY_APPLICANTS_URL, { waitUntil: 'networkidle' });
    console.log(`   URL: ${page.url()}`);

    await page.screenshot({ path: 'debug-applicants.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-applicants.png');

    // HTMLを保存
    const applicantsHtml = await page.content();
    fs.writeFileSync('debug-applicants.html', applicantsHtml);
    console.log('   HTML保存: debug-applicants.html');

    // 応募者データを探す
    console.log('\n6. 応募者データを抽出中...');

    const applicantsData = await page.evaluate(() => {
      // 応募者数を探す
      const text = document.body.innerText;
      const countMatch = text.match(/([0-9]+)\s*件/);

      // 応募者リストを探す
      const list = document.querySelectorAll('.applicant-item, .message-item, tr.applicant');

      return {
        totalText: countMatch ? countMatch[0] : null,
        listCount: list.length,
        pageText: text.substring(0, 1000)
      };
    });

    if (applicantsData.totalText) {
      console.log(`   応募件数表示: ${applicantsData.totalText}`);
    }
    console.log(`   リストアイテム数: ${applicantsData.listCount}`);

    // デバッグモードの場合は待機
    if (isDebug) {
      console.log('\n[デバッグモード] ブラウザを60秒間表示します...');
      await page.waitForTimeout(60000);
    }

    console.log('\n=== テスト完了 ===');

  } catch (error) {
    console.error('\nエラーが発生しました:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 実行
testGuppyScrape();
