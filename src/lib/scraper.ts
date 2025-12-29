import { chromium, Browser, Page } from 'playwright';
import { ScrapeResult, AccessLogEntry } from '@/types';

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_ACCESS_LOG_URL = 'https://www.guppy.jp/service/access_logs';

/**
 * 過去N月分の年月リストを生成
 */
function getMonthsToScrape(monthsBack: number = 6): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const now = new Date();

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    });
  }

  return months;
}

/**
 * ページからテーブルデータを抽出
 */
async function extractTableData(page: Page): Promise<AccessLogEntry[]> {
  return await page.evaluate((): AccessLogEntry[] => {
    const table = document.querySelector('table');
    if (!table) return [];

    const rows = table.querySelectorAll('tr');
    const results: AccessLogEntry[] = [];

    rows.forEach((row, index) => {
      if (index === 0) return; // ヘッダーをスキップ

      const cells = row.querySelectorAll('td');
      if (cells.length >= 5) {
        const parseNumber = (text: string) => parseInt(text.replace(/[^0-9]/g, '') || '0', 10);
        const date = cells[0]?.textContent?.trim() || '';

        // 有効な日付のみ追加
        if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          results.push({
            date,
            displayCount: parseNumber(cells[1]?.textContent || '0'),
            viewCount: parseNumber(cells[2]?.textContent || '0'),
            redirectCount: parseNumber(cells[3]?.textContent || '0'),
            applicationCount: parseNumber(cells[4]?.textContent || '0'),
          });
        }
      }
    });

    return results;
  });
}

/**
 * GUPPYにログインして日別アクセスログを取得（過去6ヶ月分）
 */
export async function scrapeGuppy(
  clinicId: string,
  clinicName: string,
  loginId: string,
  password: string,
  monthsBack: number = 6
): Promise<ScrapeResult | null> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    await page.goto(GUPPY_LOGIN_URL, { waitUntil: 'networkidle' });
    await page.fill('input[name="data[Account][login_id]"]', loginId);
    await page.fill('input[name="data[Account][password]"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // ログイン確認
    if (page.url().includes('login')) {
      console.error(`Login failed for clinic ${clinicName}`);
      return null;
    }

    // 過去6ヶ月分のデータを取得
    const allAccessLogs: AccessLogEntry[] = [];
    const months = getMonthsToScrape(monthsBack);

    for (const { year, month } of months) {
      // 月別のURLでアクセス（GUPPY形式: /service/access_logs/YYYY-MM）
      const monthStr = String(month).padStart(2, '0');
      const url = `${GUPPY_ACCESS_LOG_URL}/${year}-${monthStr}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const monthLogs = await extractTableData(page);
      console.log(`[${clinicName}] ${year}年${month}月: ${monthLogs.length}日分`);
      allAccessLogs.push(...monthLogs);
    }

    // 重複を除去（日付でユニーク化）
    const uniqueLogs = Array.from(
      new Map(allAccessLogs.map(log => [log.date, log])).values()
    );

    console.log(`[${clinicName}] 合計 ${uniqueLogs.length}日分のデータを取得`);

    return {
      clinicId,
      clinicName,
      accessLogs: uniqueLogs,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error(`Error scraping GUPPY for clinic ${clinicId}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
