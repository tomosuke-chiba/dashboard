/**
 * Quacareerスクレイパーライブラリのテスト
 *
 * 使用方法:
 * npx ts-node scripts/test-quacareer-lib.ts
 */

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { chromium } = require('playwright');

const QUACAREER_LOGIN_URL = 'https://customer.quacareer.com/login';
const QUACAREER_TOP_URL = 'https://customer.quacareer.com/';
const QUACAREER_SCOUT_URL = 'https://customer.quacareer.com/scout/maillist';

interface QuacareerDashboardData {
  totalApplicants: number;
  favoritesDH: number;
  favoritesDR: number;
  scoutMailOpenRate: number;
  scoutPlusOpenRate: number;
}

interface QuacareerScoutMail {
  deliveryDate: string;
  targetJobType: string;
  message: string;
  deliveryCount: number;
  openRate: number;
}

async function testQuacareerLibrary() {
  console.log('=== Quacareerスクレイパーライブラリテスト ===\n');

  const email = process.env.QUACAREER_EMAIL;
  const password = process.env.QUACAREER_PASSWORD;

  if (!email || !password) {
    console.error('QUACAREER_EMAIL and QUACAREER_PASSWORD must be set in .env.local');
    process.exit(1);
  }

  let browser = null;

  try {
    console.log('1. ブラウザを起動中...');
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    console.log('2. ログイン中...');
    await page.goto(QUACAREER_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const emailInput = await page.$('input[name="email"], input[type="email"]');
    if (emailInput) await emailInput.fill(email);

    const passwordInput = await page.$('input[name="password"], input[type="password"]');
    if (passwordInput) await passwordInput.fill(password);

    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) await submitButton.click();

    await page.waitForTimeout(5000);

    if (page.url().includes('login')) {
      console.error('ログイン失敗');
      return;
    }
    console.log('   ログイン成功!');

    // ダッシュボードデータ取得
    console.log('\n3. ダッシュボードデータを取得中...');
    const dashboardData: QuacareerDashboardData = await page.evaluate(() => {
      const result = {
        totalApplicants: 0,
        favoritesDH: 0,
        favoritesDR: 0,
        scoutMailOpenRate: 0,
        scoutPlusOpenRate: 0,
      };

      const pageText = document.body.innerText;

      // 累計応募者数を探す（改行を含むパターンに対応）
      const applicantMatch = pageText.match(/累計応募者数[\s\S]*?(\d+)/);
      if (applicantMatch) {
        result.totalApplicants = parseInt(applicantMatch[1], 10);
      }

      // お気に入り登録者数を探す（職種別）
      const dhMatch = pageText.match(/歯科衛生士[：:\s　]*(\d+)/);
      if (dhMatch) {
        result.favoritesDH = parseInt(dhMatch[1], 10);
      }

      const drMatch = pageText.match(/歯科医師[：:\s　]*(\d+)/);
      if (drMatch) {
        result.favoritesDR = parseInt(drMatch[1], 10);
      }

      // スカウトメール平均開封率（改行を含むパターンに対応）
      const scoutMailMatch = pageText.match(/スカウトメール平均開封率[\s\S]*?([\d.]+)\s*%/);
      if (scoutMailMatch) {
        result.scoutMailOpenRate = parseFloat(scoutMailMatch[1]);
      }

      // スカウトプラス平均開封率（改行を含むパターンに対応）
      const scoutPlusMatch = pageText.match(/スカウトプラス平均開封率[\s\S]*?([\d.]+)\s*%/);
      if (scoutPlusMatch) {
        result.scoutPlusOpenRate = parseFloat(scoutPlusMatch[1]);
      }

      return result;
    });

    console.log('\n=== 取得結果 ===');
    console.log('\n【ダッシュボードデータ】');
    console.log(`  累計応募者数: ${dashboardData.totalApplicants}名`);
    console.log(`  お気に入り登録者数（歯科衛生士）: ${dashboardData.favoritesDH}名`);
    console.log(`  お気に入り登録者数（歯科医師）: ${dashboardData.favoritesDR}名`);
    console.log(`  スカウトメール平均開封率: ${dashboardData.scoutMailOpenRate}%`);
    console.log(`  スカウトプラス平均開封率: ${dashboardData.scoutPlusOpenRate}%`);

    // スカウトメール一覧取得
    console.log('\n4. スカウトメール一覧を取得中...');
    await page.goto(QUACAREER_SCOUT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const scoutMails: QuacareerScoutMail[] = await page.evaluate(() => {
      const results: QuacareerScoutMail[] = [];
      const tableRows = document.querySelectorAll('table tbody tr');

      tableRows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const deliveryDate = cells[0]?.textContent?.trim() || '';
          const targetJobType = cells[1]?.textContent?.trim() || '';
          const message = cells[2]?.textContent?.trim() || '';
          const deliveryCountText = cells[3]?.textContent?.trim() || '0';
          const openRateText = cells[4]?.textContent?.trim() || '0';

          const deliveryCount = parseInt(deliveryCountText.replace(/[,，]/g, ''), 10) || 0;
          const openRateMatch = openRateText.match(/([\d.]+)/);
          const openRate = openRateMatch ? parseFloat(openRateMatch[1]) : 0;

          if (deliveryDate) {
            results.push({
              deliveryDate,
              targetJobType,
              message,
              deliveryCount,
              openRate,
            });
          }
        }
      });

      return results;
    });

    console.log('\n【スカウトメール一覧】');
    console.log(`  取得件数: ${scoutMails.length}件`);
    if (scoutMails.length > 0) {
      console.log('\n  最新5件:');
      scoutMails.slice(0, 5).forEach((mail, index) => {
        console.log(`  ${index + 1}. ${mail.deliveryDate} | ${mail.targetJobType} | ${mail.deliveryCount}件配信 | 開封率${mail.openRate}%`);
        console.log(`     メッセージ: ${mail.message.substring(0, 40)}...`);
      });
    }

    console.log('\n=== テスト完了 ===');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testQuacareerLibrary();
