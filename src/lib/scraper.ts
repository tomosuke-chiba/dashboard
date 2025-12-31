import { chromium, Browser, Page } from 'playwright';
import { ScrapeResult, AccessLogEntry, JobType, JobTypeAccessLog, PHASE1_JOB_TYPES } from '@/types';

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_ACCESS_LOG_URL = 'https://www.guppy.jp/service/access_logs';
const GUPPY_MESSAGE_THREAD_URL = 'https://www.guppy.jp/service/message_thread';

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

/**
 * アクセスログページのドロップダウンから求人ID一覧を抽出
 * ドロップダウンのテキスト例: "歯科衛生士（正社員）[1234567]"
 * 正規表現 /\[(\d+)\]/ でIDを抽出
 */
async function extractJobListingsFromDropdown(page: Page): Promise<JobListing[]> {
  return await page.evaluate(() => {
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
          name: text.replace(/\[\d+\]/, '').trim(), // ID部分を除いた求人名
          jobType: null, // 後でdetectJobTypeFromNameで設定
        });
      }
    });

    return listings;
  });
}

/**
 * 求人ID一覧を取得し、職種を判定して返す
 */
async function getJobListingsWithJobType(page: Page): Promise<JobListing[]> {
  const listings = await extractJobListingsFromDropdown(page);

  return listings.map((listing) => ({
    ...listing,
    jobType: detectJobTypeFromName(listing.name),
  }));
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
 * GUPPYから職種別アクセスログを取得（求人IDベース）
 * 1. アクセスログページのドロップダウンから求人ID一覧を抽出
 * 2. 各求人IDごとにアクセスログURLにアクセス
 * 3. 求人名から職種を判定してデータを保存
 */
export async function scrapeGuppyByJobType(
  clinicId: string,
  clinicName: string,
  loginId: string,
  password: string,
  _jobTypes: JobType[] = PHASE1_JOB_TYPES, // 互換性のため残すが使用しない
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

    // 最初の月のページにアクセスして求人ID一覧を取得
    const firstMonth = months[0];
    const firstMonthStr = String(firstMonth.month).padStart(2, '0');
    const firstUrl = `${GUPPY_ACCESS_LOG_URL}/${firstMonth.year}-${firstMonthStr}`;
    await page.goto(firstUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // ドロップダウンから求人ID一覧を取得
    const jobListings = await getJobListingsWithJobType(page);
    console.log(`[${clinicName}] 求人数: ${jobListings.length}件`);

    if (jobListings.length === 0) {
      console.log(`[${clinicName}] 求人が見つかりませんでした。合計データのみ取得します。`);
      // 求人がない場合は従来の合計取得にフォールバック
      const allAccessLogs: AccessLogEntry[] = [];
      for (const { year, month } of months) {
        const monthStr = String(month).padStart(2, '0');
        const url = `${GUPPY_ACCESS_LOG_URL}/${year}-${monthStr}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const monthLogs = await extractTableData(page);
        allAccessLogs.push(...monthLogs);
      }

      const uniqueLogs = Array.from(
        new Map(allAccessLogs.map(log => [log.date, log])).values()
      );

      return {
        clinicId,
        clinicName,
        accessLogs: uniqueLogs,
        scrapedAt: new Date(),
      };
    }

    // 職種別にログを集計するためのマップ
    const jobTypeLogsMap: Map<JobType, AccessLogEntry[]> = new Map();
    const allAccessLogs: AccessLogEntry[] = [];

    // 各求人IDごとにデータを取得
    for (const listing of jobListings) {
      console.log(`[${clinicName}] 求人: ${listing.name} (ID: ${listing.id}, 職種: ${listing.jobType || '不明'})`);

      const jobLogs: AccessLogEntry[] = [];

      for (const { year, month } of months) {
        const monthStr = String(month).padStart(2, '0');
        // 求人ID別のアクセスログURL: /service/access_logs/YYYY-MM/JOB_ID
        const url = `${GUPPY_ACCESS_LOG_URL}/${year}-${monthStr}/${listing.id}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const monthLogs = await extractTableData(page);
        console.log(`  ${year}年${month}月: ${monthLogs.length}日分`);
        jobLogs.push(...monthLogs);
      }

      // 重複を除去
      const uniqueJobLogs = Array.from(
        new Map(jobLogs.map(log => [log.date, log])).values()
      );

      // 全体のログに追加
      allAccessLogs.push(...uniqueJobLogs);

      // 職種が判定できた場合、職種別にも集計
      if (listing.jobType) {
        const existingLogs = jobTypeLogsMap.get(listing.jobType) || [];
        jobTypeLogsMap.set(listing.jobType, [...existingLogs, ...uniqueJobLogs]);
      }
    }

    // 職種別ログを集計（同じ日付は合算）
    const jobTypeAccessLogs: JobTypeAccessLog[] = [];
    for (const [jobType, logs] of jobTypeLogsMap) {
      // 同じ日付のデータを合算
      const dateMap = new Map<string, AccessLogEntry>();
      for (const log of logs) {
        const existing = dateMap.get(log.date);
        if (existing) {
          dateMap.set(log.date, {
            date: log.date,
            displayCount: existing.displayCount + log.displayCount,
            viewCount: existing.viewCount + log.viewCount,
            redirectCount: existing.redirectCount + log.redirectCount,
            applicationCount: existing.applicationCount + log.applicationCount,
          });
        } else {
          dateMap.set(log.date, { ...log });
        }
      }

      jobTypeAccessLogs.push({
        jobType,
        accessLogs: Array.from(dateMap.values()),
      });
    }

    // 全体も同様に日付で合算
    const allDateMap = new Map<string, AccessLogEntry>();
    for (const log of allAccessLogs) {
      const existing = allDateMap.get(log.date);
      if (existing) {
        allDateMap.set(log.date, {
          date: log.date,
          displayCount: existing.displayCount + log.displayCount,
          viewCount: existing.viewCount + log.viewCount,
          redirectCount: existing.redirectCount + log.redirectCount,
          applicationCount: existing.applicationCount + log.applicationCount,
        });
      } else {
        allDateMap.set(log.date, { ...log });
      }
    }

    const uniqueAllLogs = Array.from(allDateMap.values());
    console.log(`[${clinicName}] 職種別取得完了: ${jobTypeAccessLogs.length}職種, ${uniqueAllLogs.length}日分`);

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

// スカウトメモの職種マッピング
const SCOUT_JOB_TYPE_MAP: Record<string, JobType> = {
  'DH': 'dh',
  'DR': 'dr',
  'DA': 'da',
  '歯科衛生士': 'dh',
  '歯科医師': 'dr',
  '歯科助手': 'da',
};

interface ScoutMemoEntry {
  date: string;       // YYYY-MM-DD形式
  jobType: JobType | null;
  memo: string;
}

// スレッドごとのスカウトメモ情報
interface ThreadScoutInfo {
  threadId: string;
  memos: { memo: string; created: string }[];
}

export interface DailyScoutData {
  date: string;
  sentCount: number;
  replyCount: number;
}

/**
 * スカウトメモから日付と職種を抽出
 * 形式: "1226 DH スカウト" → { date: "2024-12-26", jobType: "dh" }
 */
function parseScoutMemo(memo: string, createdDate: string): ScoutMemoEntry | null {
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
  let jobType: JobType | null = null;
  for (const [key, value] of Object.entries(SCOUT_JOB_TYPE_MAP)) {
    if (memo.toUpperCase().includes(key.toUpperCase())) {
      jobType = value;
      break;
    }
  }

  return { date, jobType, memo };
}

/**
 * ページからスレッドごとのスカウトメモを抽出
 */
async function extractThreadScoutInfos(page: Page): Promise<ThreadScoutInfo[]> {
  return await page.evaluate(() => {
    const results: { threadId: string; memos: { memo: string; created: string }[] }[] = [];

    // 各スレッドの.block-message-boxを取得
    const threadElements = document.querySelectorAll('li.block-message-box');

    threadElements.forEach((threadEl) => {
      const threadId = threadEl.getAttribute('data-message_thread_id') || '';
      if (!threadId) return;

      const memos: { memo: string; created: string }[] = [];

      // このスレッドのスカウトメモを取得
      const memoList = threadEl.querySelector('.scout-memo-list');
      if (memoList) {
        const items = memoList.querySelectorAll('li.list-memo-body');
        items.forEach((item) => {
          const memoText = item.childNodes[0]?.textContent?.trim() || '';
          const createdSpan = item.querySelector('.list-memo-created');
          const created = createdSpan?.textContent?.trim() || '';

          if (memoText && created) {
            memos.push({ memo: memoText, created });
          }
        });
      }

      results.push({ threadId, memos });
    });

    return results;
  });
}

/**
 * 「もっと見る」ボタンを繰り返しクリックして全件表示
 */
async function loadAllThreads(page: Page): Promise<void> {
  while (true) {
    const loadMoreButton = await page.$('a.mod-button:has-text("もっと見る"), button:has-text("もっと見る"), a#js-auto-pager-more');
    if (loadMoreButton) {
      await loadMoreButton.click();
      await page.waitForTimeout(1000);
    } else {
      break;
    }
  }
}

/**
 * スカウトメールの日別送信数・返信数を取得（スカウトメモベース）
 *
 * 取得方法:
 * 1. scout_no_reply タブから未返信スカウトのスレッドIDとメモを取得
 * 2. type_scout フィルタでスカウト全体のスレッドIDとメモを取得
 * 3. 全体 - 未返信 = 返信ありスレッドを特定
 * 4. 各スレッドのスカウトメモから日付を抽出して日別に集計
 */
export async function scrapeGuppyScoutMessages(
  clinicId: string,
  clinicName: string,
  loginId: string,
  password: string
): Promise<{ dailyData: DailyScoutData[]; totalSent: number; totalReply: number } | null> {
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
    await page.waitForTimeout(3000);

    // ログイン確認
    if (page.url().includes('login')) {
      console.error(`Login failed for clinic ${clinicName}`);
      return null;
    }

    // ========================================
    // Step 1: スカウト未返信ページから未返信スレッドを取得
    // ========================================
    await page.goto(`${GUPPY_MESSAGE_THREAD_URL}?filter_tab=scout_no_reply`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await loadAllThreads(page);

    const noReplyThreadInfos = await extractThreadScoutInfos(page);
    const noReplyThreadIds = new Set(noReplyThreadInfos.map(t => t.threadId));
    console.log(`[${clinicName}] スカウト未返信スレッド数: ${noReplyThreadIds.size}`);

    // ========================================
    // Step 2: スカウト全体（type_scoutフィルタ）を取得
    // ========================================
    // POSTリクエストでtype_scoutフィルタを適用
    await page.goto(`${GUPPY_MESSAGE_THREAD_URL}?filter_tab=all`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // type_scoutチェックボックスをクリックして検索
    const typeScoutCheckbox = await page.$('input#OtherFilterTypeScout');
    if (typeScoutCheckbox) {
      await typeScoutCheckbox.check();
      // 検索ボタンをクリック
      const searchButton = await page.$('button.message_thread_modal_search_button');
      if (searchButton) {
        await searchButton.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');
      }
    }

    await loadAllThreads(page);
    const allScoutThreadInfos = await extractThreadScoutInfos(page);
    console.log(`[${clinicName}] スカウト全体スレッド数: ${allScoutThreadInfos.length}`);

    // ========================================
    // Step 3: 返信ありスレッドを特定
    // ========================================
    const repliedThreadInfos = allScoutThreadInfos.filter(t => !noReplyThreadIds.has(t.threadId));
    console.log(`[${clinicName}] スカウト返信ありスレッド数: ${repliedThreadInfos.length}`);

    // ========================================
    // Step 4: 日別に送信数・返信数を集計
    // ========================================
    const dailySentMap = new Map<string, number>();
    const dailyReplyMap = new Map<string, number>();

    // 全スカウトスレッドから送信数を集計
    for (const threadInfo of allScoutThreadInfos) {
      for (const memoData of threadInfo.memos) {
        const entry = parseScoutMemo(memoData.memo, memoData.created);
        if (entry && memoData.memo.includes('スカウト')) {
          dailySentMap.set(entry.date, (dailySentMap.get(entry.date) || 0) + 1);
        }
      }
    }

    // 返信ありスレッドから返信数を集計（最初のスカウトメモの日付を使用）
    for (const threadInfo of repliedThreadInfos) {
      // スカウトメモの中で最初の「スカウト」を含むメモを探す
      for (const memoData of threadInfo.memos) {
        const entry = parseScoutMemo(memoData.memo, memoData.created);
        if (entry && memoData.memo.includes('スカウト')) {
          dailyReplyMap.set(entry.date, (dailyReplyMap.get(entry.date) || 0) + 1);
          break; // 1スレッドにつき1返信としてカウント
        }
      }
    }

    // 全日付を収集
    const allDates = new Set([...dailySentMap.keys(), ...dailyReplyMap.keys()]);

    // DailyScoutData形式に変換
    const dailyData: DailyScoutData[] = Array.from(allDates).map(date => ({
      date,
      sentCount: dailySentMap.get(date) || 0,
      replyCount: dailyReplyMap.get(date) || 0,
    }));

    // 日付でソート（降順）
    dailyData.sort((a, b) => b.date.localeCompare(a.date));

    const totalSent = Array.from(dailySentMap.values()).reduce((sum, count) => sum + count, 0);
    const totalReply = repliedThreadInfos.length;
    console.log(`[${clinicName}] スカウトメール: 送信${totalSent}通, 返信${totalReply}件 (${dailyData.length}日分)`);

    return { dailyData, totalSent, totalReply };
  } catch (error) {
    console.error(`Error scraping scout messages for clinic ${clinicId}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}