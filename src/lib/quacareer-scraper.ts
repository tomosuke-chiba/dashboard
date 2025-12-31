import { chromium, Browser, Page } from 'playwright';

const QUACAREER_LOGIN_URL = 'https://customer.quacareer.com/login';
const QUACAREER_TOP_URL = 'https://customer.quacareer.com/';
const QUACAREER_SCOUT_URL = 'https://customer.quacareer.com/scout/maillist';

// クオキャリア ダッシュボードデータ型
export interface QuacareerDashboardData {
  totalApplicants: number;           // 累計応募者数
  favoritesDH: number;               // お気に入り登録者数（歯科衛生士）
  favoritesDR: number;               // お気に入り登録者数（歯科医師）
  scoutMailOpenRate: number;         // スカウトメール平均開封率
  scoutPlusOpenRate: number;         // スカウトプラス平均開封率
}

// クオキャリア スカウトメール型
export interface QuacareerScoutMail {
  deliveryDate: string;              // 配信日時
  targetJobType: string;             // 対象職種
  message: string;                   // メッセージ
  deliveryCount: number;             // 配信件数
  openRate: number;                  // 開封率（%）
}

// スクレイピング結果の型
export interface QuacareerScrapeResult {
  dashboard: QuacareerDashboardData | null;
  scoutMails: QuacareerScoutMail[];
  scrapedAt: Date;
}

/**
 * クオキャリアにログイン
 */
async function login(page: Page, email: string, password: string): Promise<boolean> {
  try {
    console.log('Quacareer: Logging in...');
    await page.goto(QUACAREER_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // メールアドレス入力
    const emailInput = await page.$('input[name="email"], input[type="email"], input[id="email"]');
    if (emailInput) {
      await emailInput.fill(email);
    } else {
      console.error('Quacareer: Email input not found');
      return false;
    }

    // パスワード入力
    const passwordInput = await page.$('input[name="password"], input[type="password"], input[id="password"]');
    if (passwordInput) {
      await passwordInput.fill(password);
    } else {
      console.error('Quacareer: Password input not found');
      return false;
    }

    // ログインボタンクリック
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    }

    await page.waitForTimeout(5000);

    // ログイン確認（URLがloginでなければ成功）
    if (page.url().includes('login')) {
      console.error('Quacareer: Login failed - still on login page');
      return false;
    }

    console.log('Quacareer: Login successful');
    return true;
  } catch (error) {
    console.error('Quacareer: Login error:', error);
    return false;
  }
}

/**
 * 数値を文字列からパース（カンマ区切り対応）
 */
function parseNumber(text: string | null | undefined): number {
  if (!text) return 0;
  const cleanedText = text.replace(/[,，]/g, '').trim();
  const match = cleanedText.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * パーセンテージを文字列からパース
 */
function parsePercentage(text: string | null | undefined): number {
  if (!text) return 0;
  const match = text.match(/([\d.]+)\s*%?/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * ダッシュボード（トップページ）からデータを取得
 */
export async function scrapeQuacareerDashboard(
  email: string,
  password: string
): Promise<QuacareerDashboardData | null> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    const loggedIn = await login(page, email, password);
    if (!loggedIn) return null;

    // トップページに移動（ログイン後既にトップページの可能性あり）
    if (!page.url().includes('customer.quacareer.com') || page.url().includes('login')) {
      await page.goto(QUACAREER_TOP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await page.waitForTimeout(3000);

    console.log('Quacareer: Scraping dashboard data...');

    // ダッシュボードデータを抽出
    const dashboardData = await page.evaluate(() => {
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
      // 歯科衛生士
      const dhMatch = pageText.match(/歯科衛生士[：:\s　]*(\d+)/);
      if (dhMatch) {
        result.favoritesDH = parseInt(dhMatch[1], 10);
      }

      // 歯科医師
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

    console.log(`Quacareer Dashboard: Applicants=${dashboardData.totalApplicants}, FavoritesDH=${dashboardData.favoritesDH}, FavoritesDR=${dashboardData.favoritesDR}, ScoutMailRate=${dashboardData.scoutMailOpenRate}%, ScoutPlusRate=${dashboardData.scoutPlusOpenRate}%`);

    return dashboardData;
  } catch (error) {
    console.error('Quacareer: Error scraping dashboard:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * スカウトメール一覧を取得
 */
export async function scrapeQuacareerScoutMails(
  email: string,
  password: string
): Promise<QuacareerScoutMail[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    const loggedIn = await login(page, email, password);
    if (!loggedIn) return [];

    // スカウトメール一覧ページに移動
    console.log('Quacareer: Navigating to scout mail list...');
    await page.goto(QUACAREER_SCOUT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // テーブルからスカウトメールデータを抽出
    const scoutMails = await page.evaluate(() => {
      const results: {
        deliveryDate: string;
        targetJobType: string;
        message: string;
        deliveryCount: number;
        openRate: number;
      }[] = [];

      // テーブル行を探す
      const tableRows = document.querySelectorAll('table tbody tr, .scout-list tr, .mail-list tr, [class*="scout"] tr');

      tableRows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const deliveryDate = cells[0]?.textContent?.trim() || '';
          const targetJobType = cells[1]?.textContent?.trim() || '';
          const message = cells[2]?.textContent?.trim() || '';
          const deliveryCountText = cells[3]?.textContent?.trim() || '0';
          const openRateText = cells[4]?.textContent?.trim() || '0';

          const deliveryCount = parseInt(deliveryCountText.replace(/[,，]/g, ''), 10) || 0;
          const openRateMatch = openRateText.match(/([\d.]+)/);
          const openRate = openRateMatch ? parseFloat(openRateMatch[1]) : 0;

          if (deliveryDate || targetJobType || message) {
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

    console.log(`Quacareer: Found ${scoutMails.length} scout mails`);

    return scoutMails;
  } catch (error) {
    console.error('Quacareer: Error scraping scout mails:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * クオキャリアの全データを一括取得
 */
export async function scrapeQuacareer(
  email: string,
  password: string
): Promise<QuacareerScrapeResult> {
  console.log('Starting Quacareer scrape...');

  const dashboard = await scrapeQuacareerDashboard(email, password);
  const scoutMails = await scrapeQuacareerScoutMails(email, password);

  return {
    dashboard,
    scoutMails,
    scrapedAt: new Date(),
  };
}

/**
 * デバッグ用: ページ情報を保存
 */
export async function debugQuacareerPage(
  email: string,
  password: string,
  pageName: string,
  url: string
): Promise<{ html: string; screenshot: Buffer } | null> {
  let browser: Browser | null = null;

  try {
    const isDebug = process.env.DEBUG === 'true';
    browser = await chromium.launch({ headless: !isDebug });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    const loggedIn = await login(page, email, password);
    if (!loggedIn) return null;

    // 指定ページに移動
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const html = await page.content();
    const screenshot = await page.screenshot({ fullPage: true });

    if (isDebug) {
      console.log(`Debug mode: Browser will stay open for 60 seconds...`);
      await page.waitForTimeout(60000);
    }

    return { html, screenshot };
  } catch (error) {
    console.error(`Quacareer: Error debugging ${pageName}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
