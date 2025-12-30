import { chromium, Browser, Page } from 'playwright';
import { ScrapeResult, AccessLogEntry, JobType, JobTypeAccessLog, PHASE1_JOB_TYPES } from '@/types';

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_ACCESS_LOG_URL = 'https://www.guppy.jp/service/access_logs';
const GUPPY_MESSAGE_THREAD_URL = 'https://www.guppy.jp/service/message_thread';

// GUPPYでの職種識別子（実際のセレクタは要調査）
const GUPPY_JOB_TYPE_MAP: Record<JobType, string> = {
  dr: 'dds',      // 歯科医師
  dh: 'dh',       // 歯科衛生士
  da: 'da',       // 歯科助手
  reception: 'reception',
  technician: 'technician',
  dietitian: 'dietitian',
  nursery: 'nursery',
  kindergarten: 'kindergarten',
  medical_clerk: 'medical_clerk',
};

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
 * 職種タブを選択（GUPPYの実際のUI構造に依存）
 * 注意: 実際のセレクタは管理画面の調査後に更新が必要
 */
async function selectJobTypeTab(page: Page, jobType: JobType): Promise<boolean> {
  const guppyJobType = GUPPY_JOB_TYPE_MAP[jobType];

  try {
    // 職種タブのセレクタ（実際の構造に合わせて調整が必要）
    // 想定されるパターン:
    // 1. タブボタン: [data-job-type="dds"], .job-type-tab[data-type="dds"]
    // 2. セレクトボックス: select[name="job_type"] option[value="dds"]
    // 3. リンク: a[href*="job_type=dds"]

    // パターン1: タブボタン
    const tabSelector = `[data-job-type="${guppyJobType}"], .job-type-tab[data-type="${guppyJobType}"]`;
    const tabExists = await page.$(tabSelector);
    if (tabExists) {
      await page.click(tabSelector);
      await page.waitForTimeout(1000);
      return true;
    }

    // パターン2: セレクトボックス
    const selectExists = await page.$('select[name="job_type"]');
    if (selectExists) {
      await page.selectOption('select[name="job_type"]', guppyJobType);
      await page.waitForTimeout(1000);
      return true;
    }

    // パターン3: URLパラメータで切り替え
    const currentUrl = page.url();
    const urlWithJobType = currentUrl.includes('?')
      ? `${currentUrl}&job_type=${guppyJobType}`
      : `${currentUrl}?job_type=${guppyJobType}`;
    await page.goto(urlWithJobType, { waitUntil: 'networkidle' });
    return true;
  } catch (error) {
    console.error(`Failed to select job type ${jobType}:`, error);
    return false;
  }
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

    // 過去6ヶ月分のデータを取得（合計）
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

/**
 * GUPPYから職種別アクセスログを取得
 */
export async function scrapeGuppyByJobType(
  clinicId: string,
  clinicName: string,
  loginId: string,
  password: string,
  jobTypes: JobType[] = PHASE1_JOB_TYPES,
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

    const months = getMonthsToScrape(monthsBack);
    const allAccessLogs: AccessLogEntry[] = [];
    const jobTypeAccessLogs: JobTypeAccessLog[] = [];

    // 各職種ごとにデータを取得
    for (const jobType of jobTypes) {
      const jobTypeLogs: AccessLogEntry[] = [];

      for (const { year, month } of months) {
        const monthStr = String(month).padStart(2, '0');
        const url = `${GUPPY_ACCESS_LOG_URL}/${year}-${monthStr}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        // 職種タブを選択
        await selectJobTypeTab(page, jobType);
        await page.waitForTimeout(500);

        const monthLogs = await extractTableData(page);
        console.log(`[${clinicName}] ${jobType} ${year}年${month}月: ${monthLogs.length}日分`);
        jobTypeLogs.push(...monthLogs);
      }

      // 重複を除去
      const uniqueJobTypeLogs = Array.from(
        new Map(jobTypeLogs.map(log => [log.date, log])).values()
      );

      jobTypeAccessLogs.push({
        jobType,
        accessLogs: uniqueJobTypeLogs,
      });

      // 合計にも追加
      allAccessLogs.push(...uniqueJobTypeLogs);
    }

    // 全体の重複を除去（合計用）
    const uniqueAllLogs = Array.from(
      new Map(allAccessLogs.map(log => [log.date, log])).values()
    );

    console.log(`[${clinicName}] 職種別取得完了: ${jobTypes.length}職種`);

    return {
      clinicId,
      clinicName,
      accessLogs: uniqueAllLogs,
      jobTypeAccessLogs,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error(`Error scraping GUPPY by job type for clinic ${clinicId}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * スカウトメールの送信数を取得
 */
export async function scrapeGuppyScoutMessages(
  clinicId: string,
  clinicName: string,
  loginId: string,
  password: string
): Promise<{ sentCount: number; replyCount: number } | null> {
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

    // 未返信スカウトメールページへ
    await page.goto(`${GUPPY_MESSAGE_THREAD_URL}?filter_tab=scout_no_reply`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 「もっと見る」ボタンをクリックして全件表示
    let loadMoreExists = true;
    while (loadMoreExists) {
      const loadMoreButton = await page.$('button:has-text("もっと見る"), a:has-text("もっと見る"), .load-more');
      if (loadMoreButton) {
        await loadMoreButton.click();
        await page.waitForTimeout(1000);
      } else {
        loadMoreExists = false;
      }
    }

    // 未返信スカウトメール数をカウント
    const sentCount = await page.evaluate(() => {
      // スカウトメールのリストアイテムをカウント
      const items = document.querySelectorAll('.message-thread-item, .scout-item, tr[data-type="scout"]');
      return items.length;
    });

    // 返信ありページへ
    await page.goto(GUPPY_MESSAGE_THREAD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 「もっと見る」ボタンをクリックして全件表示
    loadMoreExists = true;
    while (loadMoreExists) {
      const loadMoreButton = await page.$('button:has-text("もっと見る"), a:has-text("もっと見る"), .load-more');
      if (loadMoreButton) {
        await loadMoreButton.click();
        await page.waitForTimeout(1000);
      } else {
        loadMoreExists = false;
      }
    }

    // 返信ありスカウトメール数をカウント
    const replyCount = await page.evaluate(() => {
      const items = document.querySelectorAll('.message-thread-item, .scout-item, tr[data-type="scout"]');
      return items.length;
    });

    console.log(`[${clinicName}] スカウトメール: 送信${sentCount + replyCount}通, 返信${replyCount}通`);

    return {
      sentCount: sentCount + replyCount, // 未返信 + 返信あり = 全送信数
      replyCount,
    };
  } catch (error) {
    console.error(`Error scraping scout messages for clinic ${clinicId}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}