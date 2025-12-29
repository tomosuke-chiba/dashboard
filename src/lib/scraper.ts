import { chromium, Browser, Page } from 'playwright';
import { ScrapeResult } from '@/types';

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';

export async function scrapeGuppy(
  clinicId: string,
  clinicName: string,
  loginId: string,
  password: string
): Promise<ScrapeResult | null> {
  let browser: Browser | null = null;

  try {
    // ブラウザを起動
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログインページにアクセス
    await page.goto(GUPPY_LOGIN_URL, { waitUntil: 'networkidle' });

    // ログインフォームに入力
    // 注意: 実際のセレクタはGUPPYのページ構造に合わせて調整が必要
    await page.fill('input[name="login_id"], input[type="text"]', loginId);
    await page.fill('input[name="password"], input[type="password"]', password);

    // ログインボタンをクリック
    await page.click('button[type="submit"], input[type="submit"]');

    // ログイン後のページ読み込みを待つ
    await page.waitForLoadState('networkidle');

    // 管理画面からデータを取得
    // 注意: 実際のセレクタとURLはGUPPYの管理画面構造に合わせて調整が必要
    const result = await extractMetrics(page, clinicId, clinicName);

    return result;
  } catch (error) {
    console.error(`Error scraping GUPPY for clinic ${clinicId}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractMetrics(
  page: Page,
  clinicId: string,
  clinicName: string
): Promise<ScrapeResult> {
  // TODO: GUPPYの管理画面構造を確認して、実際のデータ抽出ロジックを実装
  // 以下はプレースホルダー実装

  // 管理画面のダッシュボードに移動（URLは要確認）
  // await page.goto('https://www.guppy.jp/service/dashboard');

  // PVと応募数を取得（セレクタは要確認）
  let totalPV = 0;
  let totalApplications = 0;

  try {
    // 例: PVカウントを取得
    // const pvElement = await page.$('.pv-count, [data-pv]');
    // if (pvElement) {
    //   const pvText = await pvElement.textContent();
    //   totalPV = parseInt(pvText?.replace(/[^0-9]/g, '') || '0', 10);
    // }

    // 例: 応募数を取得
    // const applicationElement = await page.$('.application-count, [data-applications]');
    // if (applicationElement) {
    //   const appText = await applicationElement.textContent();
    //   totalApplications = parseInt(appText?.replace(/[^0-9]/g, '') || '0', 10);
    // }

    // 現在のURL情報をログ（デバッグ用）
    console.log('Current URL after login:', page.url());

    // ページのスクリーンショットを保存（デバッグ用）
    // await page.screenshot({ path: `debug-${clinicId}.png` });

  } catch (error) {
    console.error('Error extracting metrics:', error);
  }

  return {
    clinicId,
    clinicName,
    totalPV,
    totalApplications,
    jobs: [],
    scrapedAt: new Date(),
  };
}

// スクレイピング結果をデバッグ用に確認するための関数
export async function debugScrape(loginId: string, password: string): Promise<void> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: false, // デバッグ時は画面を表示
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(GUPPY_LOGIN_URL);
    await page.fill('input[name="login_id"], input[type="text"]', loginId);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForLoadState('networkidle');

    console.log('Logged in. Current URL:', page.url());
    console.log('Page title:', await page.title());

    // 30秒待機してページを確認
    await page.waitForTimeout(30000);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
