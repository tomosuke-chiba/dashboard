/**
 * Quacareerスクレイピングテストスクリプト
 *
 * 使用方法:
 * npx ts-node scripts/test-quacareer-scrape.ts
 * DEBUG=true npx ts-node scripts/test-quacareer-scrape.ts  # ブラウザ表示
 */

const { chromium } = require('playwright');
const fs = require('fs');
const dotenv = require('dotenv');

// .env.localを読み込み
dotenv.config({ path: '.env.local' });

const QUACAREER_LOGIN_URL = 'https://customer.quacareer.com/login';
const QUACAREER_TOP_URL = 'https://customer.quacareer.com/';
const QUACAREER_SCOUT_URL = 'https://customer.quacareer.com/scout/maillist';

async function testQuacareerScrape() {
  console.log('=== Quacareerスクレイピングテスト ===\n');

  const email = process.env.QUACAREER_EMAIL;
  const password = process.env.QUACAREER_PASSWORD;

  if (!email || !password) {
    console.error('QUACAREER_EMAIL and QUACAREER_PASSWORD must be set in .env.local');
    process.exit(1);
  }

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
    await page.goto(QUACAREER_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // ログインページのスクリーンショット
    console.log('   ログインページURL:', page.url());
    await page.screenshot({ path: 'debug-quacareer-login.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-quacareer-login.png');

    // ログインページHTMLを保存
    const loginHtml = await page.content();
    fs.writeFileSync('debug-quacareer-login.html', loginHtml);
    console.log('   HTML保存: debug-quacareer-login.html');

    // フォーム要素を探す
    const formElements = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');
      return {
        inputs: Array.from(inputs).map(el => ({
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
        })),
        buttons: Array.from(buttons).map(el => ({
          type: el.type,
          text: el.textContent?.trim(),
        })),
      };
    });
    console.log('   フォーム要素:', JSON.stringify(formElements, null, 2));

    // メールアドレス入力
    const emailInput = await page.$('input[name="email"], input[type="email"], input[id="email"]');
    if (emailInput) {
      await emailInput.fill(email);
      console.log('   メールアドレス入力完了');
    } else {
      console.log('   メールアドレス入力欄が見つかりません');
    }

    // パスワード入力
    const passwordInput = await page.$('input[name="password"], input[type="password"], input[id="password"]');
    if (passwordInput) {
      await passwordInput.fill(password);
      console.log('   パスワード入力完了');
    } else {
      console.log('   パスワード入力欄が見つかりません');
    }

    // ログインボタンクリック
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('   ログインボタンクリック');
    } else {
      console.log('   ログインボタンが見つかりません');
    }

    await page.waitForTimeout(5000);

    console.log(`   ログイン後URL: ${page.url()}`);

    // ログイン確認
    if (page.url().includes('login')) {
      console.error('   ログイン失敗');
      await page.screenshot({ path: 'debug-quacareer-login-failed.png', fullPage: true });
      const failedHtml = await page.content();
      fs.writeFileSync('debug-quacareer-login-failed.html', failedHtml);
      return;
    }

    console.log('   ログイン成功!');

    // トップページのデータ取得
    console.log('\n3. トップページのデータを取得中...');
    if (!page.url().includes('customer.quacareer.com') || page.url().includes('login')) {
      await page.goto(QUACAREER_TOP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'debug-quacareer-top.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-quacareer-top.png');

    const topHtml = await page.content();
    fs.writeFileSync('debug-quacareer-top.html', topHtml);
    console.log('   HTML保存: debug-quacareer-top.html');

    // ページテキストを抽出して解析
    const pageData = await page.evaluate(() => {
      const pageText = document.body.innerText;

      // 数値データを探す
      const patterns = {
        applicants: pageText.match(/累計応募者数[：:\s]*(\d+)/),
        favoritesDH: pageText.match(/歯科衛生士[：:\s]*(\d+)/),
        favoritesDR: pageText.match(/歯科医師[：:\s]*(\d+)/),
        scoutMailRate: pageText.match(/スカウトメール(?:平均)?開封率[：:\s]*([\d.]+)\s*%?/),
        scoutPlusRate: pageText.match(/スカウトプラス(?:平均)?開封率[：:\s]*([\d.]+)\s*%?/),
      };

      return {
        pageTextPreview: pageText.substring(0, 3000),
        matches: {
          applicants: patterns.applicants ? patterns.applicants[0] : null,
          favoritesDH: patterns.favoritesDH ? patterns.favoritesDH[0] : null,
          favoritesDR: patterns.favoritesDR ? patterns.favoritesDR[0] : null,
          scoutMailRate: patterns.scoutMailRate ? patterns.scoutMailRate[0] : null,
          scoutPlusRate: patterns.scoutPlusRate ? patterns.scoutPlusRate[0] : null,
        },
      };
    });

    console.log('   マッチしたデータ:', JSON.stringify(pageData.matches, null, 2));
    console.log('   ページテキスト（先頭3000文字）:\n', pageData.pageTextPreview);

    // スカウトメール一覧ページに移動
    console.log('\n4. スカウトメール一覧ページに移動中...');
    await page.goto(QUACAREER_SCOUT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    console.log(`   URL: ${page.url()}`);

    await page.screenshot({ path: 'debug-quacareer-scout.png', fullPage: true });
    console.log('   スクリーンショット保存: debug-quacareer-scout.png');

    const scoutHtml = await page.content();
    fs.writeFileSync('debug-quacareer-scout.html', scoutHtml);
    console.log('   HTML保存: debug-quacareer-scout.html');

    // テーブルデータを抽出
    const scoutData = await page.evaluate(() => {
      const results: {
        deliveryDate: string;
        targetJobType: string;
        message: string;
        deliveryCount: string;
        openRate: string;
      }[] = [];

      // テーブル行を探す
      const tableRows = document.querySelectorAll('table tbody tr, .scout-list tr, .mail-list tr, [class*="scout"] tr');

      const tableInfo = {
        rowCount: tableRows.length,
        tableSelectors: {
          'table tbody tr': document.querySelectorAll('table tbody tr').length,
          '.scout-list tr': document.querySelectorAll('.scout-list tr').length,
          '.mail-list tr': document.querySelectorAll('.mail-list tr').length,
        },
      };

      tableRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 1) {
          results.push({
            deliveryDate: cells[0]?.textContent?.trim() || '',
            targetJobType: cells[1]?.textContent?.trim() || '',
            message: cells[2]?.textContent?.trim().substring(0, 50) || '',
            deliveryCount: cells[3]?.textContent?.trim() || '',
            openRate: cells[4]?.textContent?.trim() || '',
          });
        }
      });

      return {
        tableInfo,
        scoutMails: results.slice(0, 10), // 最初の10件
        pageText: document.body.innerText.substring(0, 2000),
      };
    });

    console.log('   テーブル情報:', JSON.stringify(scoutData.tableInfo, null, 2));
    console.log('   スカウトメール（最初の10件）:', JSON.stringify(scoutData.scoutMails, null, 2));
    console.log('   ページテキスト（先頭2000文字）:\n', scoutData.pageText);

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
testQuacareerScrape();
