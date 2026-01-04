import { chromium, Browser, Page } from 'playwright';

const JOBMEDLEY_LOGIN_URL = 'https://customers.job-medley.com/customers/sign_in';
const JOBMEDLEY_ANALYSIS_URL = 'https://customers.job-medley.com/customers/analysis';
const JOBMEDLEY_MESSAGES_URL = 'https://customers.job-medley.com/customers/messages';
const JOBMEDLEY_STATISTICS_API = 'https://customers.job-medley.com/api/customers/statistics/total/';

// ============================================
// 日別メトリクス関連の型定義
// ============================================

// APIから取得する日別データポイント
export interface DailyMetricDataPoint {
  label: number;  // 日付（1-31）
  count: number;
}

// API レスポンスの構造
export interface JobMedleyStatisticsResponse {
  statistics: {
    pv_data: DailyMetricDataPoint[];
    apply_data: DailyMetricDataPoint[];
    apply_from_scout_data: DailyMetricDataPoint[];
    application_acceptance_data: DailyMetricDataPoint[];
  };
}

// 日別メトリクスデータ（変換後）
export interface DailyMetricData {
  date: string;  // "YYYY-MM-DD"
  pageViewCount: number;
  applicationCountTotal: number;
  scoutApplicationCount: number;
}

// スカウト送信数データ（ホバーで取得）
export interface ScoutSentData {
  date: string;
  cumSentCount: number;  // 累計
  sentCount: number;     // 日別（差分）
}

// 求人（職種）データ
export interface JobOfferData {
  jobOfferId: string;
  name: string;
}

// 求人サマリーデータ（8項目）
export interface JobOfferSummary {
  jobOfferId: string;
  name: string;
  hireCount: number;
  applicationCount: number;
  scoutApplicationCount: number;
  pageViewCount: number;
  daysSinceUpdate: number;
  photoCount: number;
  featureTags: string[];
  scoutSentCount: number;
}

// ============================================
// 既存の型定義
// ============================================

// ジョブメドレーの分析データ型
export interface JobMedleyAnalysisData {
  period: string;  // "2024-12" 形式
  hireCount: number;        // 採用決定数
  applicationCount: number; // 応募数
  scoutApplicationCount: number; // スカウト経由応募数
  pageViewCount: number;    // 求人詳細ページ閲覧数
}

// ジョブメドレーのスカウトデータ型
export interface JobMedleyScoutData {
  totalSentCount: number;   // スカウト送信数
}

// ジョブメドレーの検索順位データ型
export interface JobMedleyRankData {
  clinicName: string;
  rank: number | null;      // 順位（見つからない場合はnull）
  searchUrl: string;
  checkedAt: Date;
}

// スクレイピング結果の型
export interface JobMedleyScrapeResult {
  analysis: JobMedleyAnalysisData | null;
  scout: JobMedleyScoutData | null;
  rank: JobMedleyRankData | null;
  scrapedAt: Date;
}

/**
 * グラフの最後のデータポイント（当月）の値をツールチップから取得
 */
async function getGraphValueByHover(page: Page, graphTitle: string): Promise<number | null> {
  try {
    // グラフセクションを特定
    const graphSection = await page.$(`h2.c-heading:has-text("${graphTitle}")`);
    if (!graphSection) {
      console.log(`Graph section not found: ${graphTitle}`);
      return null;
    }

    // 親のグラフコンテナを取得
    const graphContainer = await graphSection.evaluateHandle((el) => {
      return el.closest('.c-graph');
    });

    if (!graphContainer) {
      console.log(`Graph container not found: ${graphTitle}`);
      return null;
    }

    // 最後のドット（当月）の位置を取得してホバー
    const lastDot = await page.evaluate((title: string) => {
      const heading = document.querySelector(`h2.c-heading:has-text("${title}")`);
      if (!heading) return null;

      const graphContainer = heading.closest('.c-graph');
      if (!graphContainer) return null;

      const dots = graphContainer.querySelectorAll('.recharts-area-dot');
      if (dots.length === 0) return null;

      const lastDot = dots[dots.length - 1] as SVGCircleElement;
      const rect = lastDot.getBoundingClientRect();

      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
      };
    }, graphTitle);

    if (!lastDot) {
      console.log(`Last dot not found: ${graphTitle}`);
      return null;
    }

    // ドットにホバーしてツールチップを表示
    await page.mouse.move(lastDot.x, lastDot.y);
    await page.waitForTimeout(500);

    // ツールチップから値を取得
    const value = await page.evaluate((title: string) => {
      const heading = document.querySelector(`h2.c-heading:has-text("${title}")`);
      if (!heading) return null;

      const graphContainer = heading.closest('.c-graph');
      if (!graphContainer) return null;

      const tooltip = graphContainer.querySelector('.recharts-tooltip-wrapper');
      if (!tooltip) return null;

      const text = tooltip.textContent || '';
      // 数値を抽出
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }, graphTitle);

    return value;
  } catch (error) {
    console.error(`Error getting graph value for ${graphTitle}:`, error);
    return null;
  }
}

/**
 * グラフのY軸とドット座標から値を計算（フォールバック）
 */
async function getGraphValueFromCoordinates(page: Page, graphTitle: string): Promise<number | null> {
  try {
    const result = await page.evaluate((title: string) => {
      const heading = document.querySelector(`h2.c-heading:has-text("${title}")`);
      if (!heading) return null;

      const graphContainer = heading.closest('.c-graph');
      if (!graphContainer) return null;

      // Y軸の目盛りを取得
      const yAxisTicks = graphContainer.querySelectorAll('.recharts-y-axis .recharts-cartesian-axis-tick-value');
      const yValues: number[] = [];
      yAxisTicks.forEach((tick) => {
        const val = parseFloat(tick.textContent?.trim() || '0');
        if (!isNaN(val)) {
          yValues.push(val);
        }
      });

      if (yValues.length === 0) return null;

      const maxY = Math.max(...yValues);
      const minY = Math.min(...yValues);

      // 最後のドットのY座標を取得
      const dots = graphContainer.querySelectorAll('.recharts-area-dot');
      if (dots.length === 0) return null;

      const lastDot = dots[dots.length - 1] as SVGCircleElement;
      const dotY = parseFloat(lastDot.getAttribute('cy') || '0');

      // グラフ座標系: y=10が最大、y=199が最小（0）
      const graphMinY = 10;
      const graphMaxY = 199;
      const normalizedY = (graphMaxY - dotY) / (graphMaxY - graphMinY);

      return Math.max(0, Math.round(minY + normalizedY * (maxY - minY)));
    }, graphTitle);

    return result;
  } catch (error) {
    console.error(`Error calculating graph value for ${graphTitle}:`, error);
    return null;
  }
}

/**
 * ジョブメドレーにログイン
 */
async function login(page: Page, email: string, password: string): Promise<boolean> {
  try {
    console.log('JobMedley: Logging in...');
    await page.goto(JOBMEDLEY_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // メールアドレス入力
    const emailInput = await page.$('input[name="email"], input[type="email"], input[name="customer[email]"]');
    if (emailInput) {
      await emailInput.fill(email);
    } else {
      console.error('JobMedley: Email input not found');
      return false;
    }

    // パスワード入力
    const passwordInput = await page.$('input[name="password"], input[type="password"]');
    if (passwordInput) {
      await passwordInput.fill(password);
    } else {
      console.error('JobMedley: Password input not found');
      return false;
    }

    // ログインボタンクリック
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    }

    await page.waitForTimeout(5000);

    // ログイン確認
    if (page.url().includes('sign_in') || page.url().includes('login')) {
      console.error('JobMedley: Login failed');
      return false;
    }

    console.log('JobMedley: Login successful');
    return true;
  } catch (error) {
    console.error('JobMedley: Login error:', error);
    return false;
  }
}

/**
 * 分析データを取得
 */
export async function scrapeJobMedleyAnalysis(
  email: string,
  password: string,
  year: number,
  month: number
): Promise<JobMedleyAnalysisData | null> {
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

    // 分析ページに移動
    console.log('JobMedley: Navigating to analysis page...');
    await page.goto(JOBMEDLEY_ANALYSIS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 月間を選択
    const periodTypeSelect = await page.$('select[name="period_type"]');
    if (periodTypeSelect) {
      await periodTypeSelect.selectOption('2'); // 月間
      await page.waitForTimeout(3000);
    }

    // 対象月を選択（オプションを確認してから選択）
    const monthOptions = await page.evaluate(() => {
      const select = document.querySelector('select[name="target_period"]') as HTMLSelectElement;
      if (!select) return [];
      return Array.from(select.options).map(opt => ({ value: opt.value, text: opt.textContent }));
    });

    const targetMonthStr = `${year}/${String(month).padStart(2, '0')}`;
    const targetOption = monthOptions.find(opt => opt.text && opt.text.includes(targetMonthStr));

    if (targetOption) {
      const targetPeriodSelect = await page.$('select[name="target_period"]');
      if (targetPeriodSelect) {
        await targetPeriodSelect.selectOption(targetOption.value);
        await page.waitForTimeout(3000);
      }
    } else {
      console.log(`JobMedley: Target month ${targetMonthStr} not found, using latest`);
    }

    // グラフが読み込まれるまで待機
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // 各グラフからデータを抽出（ホバーを試み、失敗したら座標計算）
    const hireCount = await getGraphValueByHover(page, '採用決定数')
      ?? await getGraphValueFromCoordinates(page, '採用決定数')
      ?? 0;

    const applicationCount = await getGraphValueByHover(page, '応募数')
      ?? await getGraphValueFromCoordinates(page, '応募数')
      ?? 0;

    const scoutApplicationCount = await getGraphValueByHover(page, 'スカウト経由応募数')
      ?? await getGraphValueFromCoordinates(page, 'スカウト経由応募数')
      ?? 0;

    const pageViewCount = await getGraphValueByHover(page, '求人詳細ページ閲覧数')
      ?? await getGraphValueFromCoordinates(page, '求人詳細ページ閲覧数')
      ?? 0;

    console.log(`JobMedley Analysis: Hire=${hireCount}, App=${applicationCount}, ScoutApp=${scoutApplicationCount}, PV=${pageViewCount}`);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      hireCount,
      applicationCount,
      scoutApplicationCount,
      pageViewCount,
    };
  } catch (error) {
    console.error('JobMedley: Error scraping analysis:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * スカウト送信数を取得
 */
export async function scrapeJobMedleyScout(
  email: string,
  password: string
): Promise<JobMedleyScoutData | null> {
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

    // メッセージページに移動
    console.log('JobMedley: Navigating to messages page...');
    await page.goto(JOBMEDLEY_MESSAGES_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // スカウト送信数を取得
    const scoutData = await page.evaluate(() => {
      const text = document.body.innerText;
      // 「スカウト N」のパターンを探す
      const match = text.match(/スカウト[\s\n\t]*(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    console.log(`JobMedley Scout: Total sent=${scoutData}`);

    return {
      totalSentCount: scoutData,
    };
  } catch (error) {
    console.error('JobMedley: Error scraping scout:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 検索順位を取得（ログイン不要）
 */
export async function scrapeJobMedleySearchRank(
  searchUrl: string,
  clinicName: string
): Promise<JobMedleyRankData> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    console.log(`JobMedley: Searching for "${clinicName}" at ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 検索結果から順位を取得
    const rank = await page.evaluate((targetName: string) => {
      // 様々なセレクタを試す
      const selectors = [
        '.c-job-offer-card',
        '.p-job-search-list__item',
        'article',
        '.job-card',
        '[data-job-offer-id]'
      ];

      let cards: NodeListOf<Element> | null = null;
      for (const selector of selectors) {
        cards = document.querySelectorAll(selector);
        if (cards.length > 0) break;
      }

      if (!cards || cards.length === 0) return null;

      let position = 0;
      for (const card of cards) {
        position++;
        const cardText = card.textContent || '';
        if (cardText.includes(targetName)) {
          return position;
        }
      }

      return null;
    }, clinicName);

    console.log(`JobMedley Search Rank: "${clinicName}" = ${rank ?? 'Not found'}`);

    return {
      clinicName,
      rank,
      searchUrl,
      checkedAt: new Date(),
    };
  } catch (error) {
    console.error('JobMedley: Error scraping search rank:', error);
    return {
      clinicName,
      rank: null,
      searchUrl,
      checkedAt: new Date(),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * ジョブメドレーの全データを一括取得
 */
export async function scrapeJobMedley(
  email: string,
  password: string,
  year: number,
  month: number,
  searchUrl?: string,
  clinicName?: string
): Promise<JobMedleyScrapeResult> {
  console.log(`Starting JobMedley scrape for ${year}-${month}...`);

  const analysis = await scrapeJobMedleyAnalysis(email, password, year, month);
  const scout = await scrapeJobMedleyScout(email, password);

  let rank: JobMedleyRankData | null = null;
  if (searchUrl && clinicName) {
    rank = await scrapeJobMedleySearchRank(searchUrl, clinicName);
  }

  return {
    analysis,
    scout,
    rank,
    scrapedAt: new Date(),
  };
}

// ============================================
// 日別データ取得（API方式）
// ============================================

/**
 * ジョブメドレーAPIから日別メトリクスを取得
 * Requirements: 1.1, 1.2, 1.3
 */
export async function fetchDailyMetricsFromAPI(
  page: Page,
  jobOfferId: string | null,
  year: number,
  month: number
): Promise<DailyMetricData[]> {
  try {
    // APIエンドポイントを構築
    const params = new URLSearchParams({
      job_offer_id: jobOfferId || '',
      period_type: '2',  // 月間
      target_year: '0',  // 現在年（API仕様に従う）
    });

    const apiUrl = `${JOBMEDLEY_STATISTICS_API}?${params.toString()}`;
    console.log(`JobMedley API: Fetching daily metrics from ${apiUrl}`);

    // Playwrightのコンテキストを利用してAPIリクエスト（認証Cookie付き）
    const response = await page.evaluate(async (url: string) => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!res.ok) {
          console.error(`API request failed: ${res.status}`);
          return null;
        }

        return await res.json();
      } catch (error) {
        console.error('Fetch error:', error);
        return null;
      }
    }, apiUrl);

    if (!response || !response.statistics) {
      console.error('JobMedley API: Invalid response structure');
      return [];
    }

    const stats = response.statistics as JobMedleyStatisticsResponse['statistics'];

    // 日別データを変換
    const dailyData: DailyMetricData[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 各配列から該当日のデータを取得
      const pvData = stats.pv_data?.find(d => d.label === day);
      const applyData = stats.apply_data?.find(d => d.label === day);
      const scoutApplyData = stats.apply_from_scout_data?.find(d => d.label === day);

      dailyData.push({
        date: dateStr,
        pageViewCount: pvData?.count ?? 0,
        applicationCountTotal: applyData?.count ?? 0,
        scoutApplicationCount: scoutApplyData?.count ?? 0,
      });
    }

    console.log(`JobMedley API: Retrieved ${dailyData.length} daily records`);
    return dailyData;
  } catch (error) {
    console.error('JobMedley API: Error fetching daily metrics:', error);
    return [];
  }
}

/**
 * 差分計算で日別送信数を算出
 * Requirements: 4.3
 */
export function calculateDailySentCount(
  cumSentData: { date: string; cumSentCount: number }[]
): ScoutSentData[] {
  const result: ScoutSentData[] = [];

  for (let i = 0; i < cumSentData.length; i++) {
    const current = cumSentData[i];
    const previous = i > 0 ? cumSentData[i - 1] : null;

    let sentCount: number;

    // 月初または累計リセット検知
    const isMonthStart = current.date.endsWith('-01');
    const isReset = previous && current.cumSentCount < previous.cumSentCount;

    if (isMonthStart || isReset || !previous) {
      // 月初・リセット時は累計値をそのまま使用
      sentCount = current.cumSentCount;
    } else {
      // 通常は差分計算
      sentCount = current.cumSentCount - previous.cumSentCount;
    }

    result.push({
      date: current.date,
      cumSentCount: current.cumSentCount,
      sentCount: Math.max(0, sentCount),  // 負の値を防ぐ
    });
  }

  return result;
}

/**
 * ログイン済みPageを使用して日別データを一括取得（APIとホバーのハイブリッド）
 */
export async function fetchDailyDataWithPage(
  page: Page,
  jobOfferId: string | null,
  year: number,
  month: number
): Promise<{
  metrics: DailyMetricData[];
  scoutSent: ScoutSentData[];
}> {
  // APIから日別メトリクスを取得
  const metrics = await fetchDailyMetricsFromAPI(page, jobOfferId, year, month);

  // スカウト送信数は別途ホバーで取得（タスク2.4で実装予定）
  // ここでは空配列を返す
  const scoutSent: ScoutSentData[] = [];

  return { metrics, scoutSent };
}

/**
 * 新規: ブラウザセッションを共有して日別データを取得
 */
export async function scrapeJobMedleyDailyData(
  email: string,
  password: string,
  year: number,
  month: number,
  jobOfferId: string | null = null
): Promise<{
  metrics: DailyMetricData[];
  scrapedAt: Date;
} | null> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    const loggedIn = await login(page, email, password);
    if (!loggedIn) {
      console.error('JobMedley: Login failed, cannot fetch daily data');
      return null;
    }

    // 分析ページに移動（Cookie確立のため）
    await page.goto(JOBMEDLEY_ANALYSIS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // APIから日別データを取得
    const metrics = await fetchDailyMetricsFromAPI(page, jobOfferId, year, month);

    return {
      metrics,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error('JobMedley: Error scraping daily data:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ============================================
// 求人リスト・サマリー取得（タスク2.2, 2.3）
// ============================================

/**
 * 分析ページの求人選択ドロップダウンから求人リストを取得
 * Requirements: 2.1, 2.2, 2.3
 */
export async function scrapeJobOfferList(page: Page): Promise<JobOfferData[]> {
  try {
    console.log('JobMedley: Scraping job offer list...');

    // 分析ページに移動（既にログイン済みを前提）
    await page.goto(JOBMEDLEY_ANALYSIS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 求人選択ドロップダウンを探す
    const jobOffers = await page.evaluate(() => {
      const results: { jobOfferId: string; name: string }[] = [];

      // パターン1: select要素
      const select = document.querySelector('select[name="job_offer_id"], select#job_offer_id') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        for (const option of options) {
          const value = option.value;
          const text = option.textContent?.trim() || '';
          // 空の値やプレースホルダーをスキップ
          if (value && value !== '' && text && !text.includes('選択') && !text.includes('全て')) {
            results.push({ jobOfferId: value, name: text });
          }
        }
        return results;
      }

      // パターン2: 検索サジェスト（input + datalist）
      const datalist = document.querySelector('datalist#job-offers, datalist[id*="job"]');
      if (datalist) {
        const options = datalist.querySelectorAll('option');
        options.forEach((option: Element) => {
          const value = option.getAttribute('value') || option.getAttribute('data-value');
          const text = option.textContent?.trim() || option.getAttribute('label') || '';
          if (value && text) {
            results.push({ jobOfferId: value, name: text });
          }
        });
        return results;
      }

      // パターン3: ラジオボタンやリスト形式
      const items = document.querySelectorAll('[data-job-offer-id], [data-job-id]');
      items.forEach((item: Element) => {
        const id = item.getAttribute('data-job-offer-id') || item.getAttribute('data-job-id');
        const text = item.textContent?.trim() || '';
        if (id && text) {
          results.push({ jobOfferId: id, name: text });
        }
      });

      return results;
    });

    console.log(`JobMedley: Found ${jobOffers.length} job offers`);
    return jobOffers;
  } catch (error) {
    console.error('JobMedley: Error scraping job offer list:', error);
    return [];
  }
}

/**
 * 求人サマリーデータを取得（8項目）
 * Requirements: 3.1, 3.2, 3.3
 */
export async function scrapeJobOfferSummary(
  page: Page,
  jobOfferId: string
): Promise<JobOfferSummary | null> {
  try {
    console.log(`JobMedley: Scraping summary for job offer ${jobOfferId}...`);

    // 分析ページに移動し、求人を選択
    await page.goto(`${JOBMEDLEY_ANALYSIS_URL}?job_offer_id=${jobOfferId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    // サマリーデータを抽出
    const summary = await page.evaluate((targetJobOfferId: string) => {
      const result: Partial<JobOfferSummary> = {
        jobOfferId: targetJobOfferId,
        name: '',
        hireCount: 0,
        applicationCount: 0,
        scoutApplicationCount: 0,
        pageViewCount: 0,
        daysSinceUpdate: 0,
        photoCount: 0,
        featureTags: [],
        scoutSentCount: 0,
      };

      // 各項目のテキストを探して数値を抽出する補助関数
      const extractNumber = (text: string): number => {
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      // ページテキストから各項目を探す
      const bodyText = document.body.innerText;

      // 採用決定数
      const hireMatch = bodyText.match(/採用決定数[：:\s]*(\d+)/);
      if (hireMatch) result.hireCount = parseInt(hireMatch[1], 10);

      // 応募数
      const applyMatch = bodyText.match(/(?<!スカウト経由)応募数[：:\s]*(\d+)/);
      if (applyMatch) result.applicationCount = parseInt(applyMatch[1], 10);

      // スカウト経由応募数
      const scoutApplyMatch = bodyText.match(/スカウト経由応募数[：:\s]*(\d+)/);
      if (scoutApplyMatch) result.scoutApplicationCount = parseInt(scoutApplyMatch[1], 10);

      // 求人詳細ページ閲覧数
      const pvMatch = bodyText.match(/(?:求人詳細ページ)?閲覧数[：:\s]*(\d+)/);
      if (pvMatch) result.pageViewCount = parseInt(pvMatch[1], 10);

      // 原稿更新からの経過日数
      const updateMatch = bodyText.match(/更新[：:\s]*(\d+)\s*日/);
      if (updateMatch) result.daysSinceUpdate = parseInt(updateMatch[1], 10);

      // 写真枚数
      const photoMatch = bodyText.match(/写真[：:\s]*(\d+)\s*枚/);
      if (photoMatch) result.photoCount = parseInt(photoMatch[1], 10);

      // スカウト送信数
      const scoutSentMatch = bodyText.match(/スカウト送信[：:\s]*(\d+)/);
      if (scoutSentMatch) result.scoutSentCount = parseInt(scoutSentMatch[1], 10);

      // 求人名を取得（ドロップダウンから）
      const select = document.querySelector('select[name="job_offer_id"]') as HTMLSelectElement;
      if (select) {
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption) {
          result.name = selectedOption.textContent?.trim() || '';
        }
      }

      return result as JobOfferSummary;
    }, jobOfferId);

    return summary;
  } catch (error) {
    console.error(`JobMedley: Error scraping summary for ${jobOfferId}:`, error);
    return null;
  }
}

/**
 * 全求人のリストとサマリーを一括取得
 */
export async function scrapeAllJobOffers(
  email: string,
  password: string
): Promise<{
  jobOffers: JobOfferData[];
  summaries: JobOfferSummary[];
  scrapedAt: Date;
} | null> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    const loggedIn = await login(page, email, password);
    if (!loggedIn) {
      console.error('JobMedley: Login failed');
      return null;
    }

    // 求人リスト取得
    const jobOffers = await scrapeJobOfferList(page);

    // 各求人のサマリーを取得
    const summaries: JobOfferSummary[] = [];
    for (const jobOffer of jobOffers) {
      const summary = await scrapeJobOfferSummary(page, jobOffer.jobOfferId);
      if (summary) {
        summary.name = jobOffer.name;  // リストの名前で上書き
        summaries.push(summary);
      }
      // レート制限対策
      await page.waitForTimeout(1000);
    }

    return {
      jobOffers,
      summaries,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error('JobMedley: Error scraping all job offers:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ============================================
// スカウト送信数ホバー取得（タスク2.4）
// ============================================

/**
 * スカウト送信数グラフから累計値をホバーで取得
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
export async function scrapeScoutSentByHover(
  page: Page,
  jobOfferId: string | null,
  year: number,
  month: number
): Promise<{ date: string; cumSentCount: number }[]> {
  try {
    console.log(`JobMedley: Scraping scout sent data by hover for ${year}-${month}...`);

    // 分析ページに移動
    const url = jobOfferId
      ? `${JOBMEDLEY_ANALYSIS_URL}?job_offer_id=${jobOfferId}`
      : JOBMEDLEY_ANALYSIS_URL;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 月間を選択
    const periodTypeSelect = await page.$('select[name="period_type"]');
    if (periodTypeSelect) {
      await periodTypeSelect.selectOption('2'); // 月間
      await page.waitForTimeout(3000);
    }

    // グラフが読み込まれるまで待機
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // スカウト送信数グラフを探す
    const graphTitle = 'スカウト送信数';
    const result: { date: string; cumSentCount: number }[] = [];

    // グラフ上のドット数を取得
    const dotsInfo = await page.evaluate((title: string) => {
      const heading = document.querySelector(`h2.c-heading:has-text("${title}")`);
      if (!heading) return null;

      const graphContainer = heading.closest('.c-graph');
      if (!graphContainer) return null;

      const dots = graphContainer.querySelectorAll('.recharts-area-dot, .recharts-line-dot');
      if (dots.length === 0) return null;

      // 各ドットの座標を取得
      const dotsData: { x: number; y: number; index: number }[] = [];
      dots.forEach((dot, index) => {
        const rect = dot.getBoundingClientRect();
        dotsData.push({
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          index,
        });
      });

      return dotsData;
    }, graphTitle);

    if (!dotsInfo || dotsInfo.length === 0) {
      console.log('JobMedley: Scout sent graph not found or no data points');
      return [];
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    // 各ドットをホバーして値を取得
    for (let i = 0; i < Math.min(dotsInfo.length, daysInMonth); i++) {
      const dot = dotsInfo[i];
      const day = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      try {
        // ドットにホバー
        await page.mouse.move(dot.x, dot.y);
        await page.waitForTimeout(300);

        // ツールチップから値を取得
        const value = await page.evaluate((title: string) => {
          const heading = document.querySelector(`h2.c-heading:has-text("${title}")`);
          if (!heading) return null;

          const graphContainer = heading.closest('.c-graph');
          if (!graphContainer) return null;

          const tooltip = graphContainer.querySelector('.recharts-tooltip-wrapper');
          if (!tooltip) return null;

          const text = tooltip.textContent || '';
          const match = text.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : null;
        }, graphTitle);

        result.push({
          date: dateStr,
          cumSentCount: value ?? 0,
        });
      } catch {
        result.push({
          date: dateStr,
          cumSentCount: 0,
        });
      }
    }

    console.log(`JobMedley: Retrieved ${result.length} scout sent data points`);
    return result;
  } catch (error) {
    console.error('JobMedley: Error scraping scout sent by hover:', error);
    return [];
  }
}

/**
 * スカウト送信数の日別データを取得（累計から差分計算）
 * Requirements: 4.1-4.5
 */
export async function scrapeScoutSentDaily(
  page: Page,
  jobOfferId: string | null,
  year: number,
  month: number
): Promise<ScoutSentData[]> {
  // 累計データを取得
  const cumData = await scrapeScoutSentByHover(page, jobOfferId, year, month);

  // 差分計算
  return calculateDailySentCount(cumData);
}

// ============================================
// 検索順位取得（タスク2.5）
// ============================================

/**
 * 職種別の検索順位を取得
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export async function scrapeSearchRankForJobOffer(
  searchUrl: string | null,
  clinicName: string
): Promise<{
  rank: number | null;
  searchUrl: string | null;
  checkedAt: Date;
}> {
  // 職種URLが未設定の場合
  if (!searchUrl) {
    console.log(`JobMedley: Search URL not configured for clinic "${clinicName}"`);
    return {
      rank: null,
      searchUrl: null,
      checkedAt: new Date(),
    };
  }

  // 既存の検索順位取得関数を利用
  const result = await scrapeJobMedleySearchRank(searchUrl, clinicName);

  return {
    rank: result.rank,
    searchUrl: result.searchUrl,
    checkedAt: result.checkedAt,
  };
}

// ============================================
// 統合スクレイパー（タスク3.1）
// ============================================

// 日別データ完全版の型
export interface DailyMetricComplete {
  date: string;
  jobOfferId: string | null;
  pageViewCount: number;
  applicationCountTotal: number;
  scoutApplicationCount: number;
  sentCount: number;
  cumSentCount: number;
  searchRank: number | null;
}

// 日次スクレイピング結果
export interface DailyScrapingResult {
  clinicId: string;
  clinicName: string;
  year: number;
  month: number;
  jobOffers: JobOfferData[];
  summaries: JobOfferSummary[];
  dailyMetrics: DailyMetricComplete[];
  scrapedAt: Date;
}

/**
 * 日次バッチ処理: 全データを一括取得
 * Requirements: 2.4 (日次自動実行)
 */
export async function scrapeJobMedleyDailyBatch(
  email: string,
  password: string,
  clinicId: string,
  clinicName: string,
  year: number,
  month: number,
  searchUrls?: Map<string, string>  // jobOfferId -> searchUrl
): Promise<DailyScrapingResult | null> {
  let browser: Browser | null = null;

  try {
    console.log(`JobMedley Daily Batch: Starting for ${clinicName} (${year}-${month})...`);

    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // 1. ログイン
    const loggedIn = await login(page, email, password);
    if (!loggedIn) {
      console.error('JobMedley Daily Batch: Login failed');
      return null;
    }

    // 2. 求人リスト取得
    const jobOffers = await scrapeJobOfferList(page);
    console.log(`JobMedley Daily Batch: Found ${jobOffers.length} job offers`);

    // 3. 各求人のサマリーを取得
    const summaries: JobOfferSummary[] = [];
    for (const jobOffer of jobOffers) {
      const summary = await scrapeJobOfferSummary(page, jobOffer.jobOfferId);
      if (summary) {
        summary.name = jobOffer.name;
        summaries.push(summary);
      }
      await page.waitForTimeout(500);
    }

    // 4. 日別メトリクスを取得（全求人合算 + 各求人個別）
    const dailyMetrics: DailyMetricComplete[] = [];

    // 4.1 全求人合算
    const allMetrics = await fetchDailyMetricsFromAPI(page, null, year, month);
    const allScoutSent = await scrapeScoutSentDaily(page, null, year, month);
    const defaultSearchUrl = searchUrls?.get('') || null;
    const defaultRank = defaultSearchUrl
      ? await scrapeSearchRankForJobOffer(defaultSearchUrl, clinicName)
      : { rank: null, searchUrl: null, checkedAt: new Date() };

    for (const metric of allMetrics) {
      const scoutData = allScoutSent.find(s => s.date === metric.date);
      dailyMetrics.push({
        date: metric.date,
        jobOfferId: null,
        pageViewCount: metric.pageViewCount,
        applicationCountTotal: metric.applicationCountTotal,
        scoutApplicationCount: metric.scoutApplicationCount,
        sentCount: scoutData?.sentCount ?? 0,
        cumSentCount: scoutData?.cumSentCount ?? 0,
        searchRank: defaultRank.rank,
      });
    }

    // 4.2 各求人個別（オプション）
    for (const jobOffer of jobOffers) {
      const metrics = await fetchDailyMetricsFromAPI(page, jobOffer.jobOfferId, year, month);
      const scoutSent = await scrapeScoutSentDaily(page, jobOffer.jobOfferId, year, month);
      const searchUrl = searchUrls?.get(jobOffer.jobOfferId) || null;
      const rankResult = searchUrl
        ? await scrapeSearchRankForJobOffer(searchUrl, clinicName)
        : { rank: null, searchUrl: null, checkedAt: new Date() };

      for (const metric of metrics) {
        const scoutData = scoutSent.find(s => s.date === metric.date);
        dailyMetrics.push({
          date: metric.date,
          jobOfferId: jobOffer.jobOfferId,
          pageViewCount: metric.pageViewCount,
          applicationCountTotal: metric.applicationCountTotal,
          scoutApplicationCount: metric.scoutApplicationCount,
          sentCount: scoutData?.sentCount ?? 0,
          cumSentCount: scoutData?.cumSentCount ?? 0,
          searchRank: rankResult.rank,
        });
      }

      await page.waitForTimeout(1000);
    }

    console.log(`JobMedley Daily Batch: Completed. ${dailyMetrics.length} daily records collected.`);

    return {
      clinicId,
      clinicName,
      year,
      month,
      jobOffers,
      summaries,
      dailyMetrics,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error('JobMedley Daily Batch: Error:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ============================================
// 求人重要指標取得（Phase E: PROF-02）
// ============================================

const JOBMEDLEY_JOB_OFFER_URL = 'https://customers.job-medley.com/customers/job_offers';

// 求人重要指標データ
export interface JobOfferIndicators {
  jobOfferId: string;
  name: string;
  title: string | null;
  hasSpeedReplyBadge: boolean;
  hasStaffVoice: boolean;
  hasWorkplaceInfo: boolean;
  mainPhotoUrl: string | null;
  photoCount: number;
  featureTags: string[];
  daysSinceUpdate: number | null;
  lastUpdatedAt: Date | null;
  scrapedAt: Date;
}

/**
 * 求人詳細ページから重要指標を取得
 * Requirements: PROF-02
 */
export async function scrapeJobOfferIndicators(
  page: Page,
  jobOfferId: string
): Promise<JobOfferIndicators | null> {
  try {
    console.log(`JobMedley: Scraping indicators for job offer ${jobOfferId}...`);

    // 求人詳細編集ページに移動
    const url = `${JOBMEDLEY_JOB_OFFER_URL}/${jobOfferId}/edit`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 重要指標を抽出
    const indicators = await page.evaluate((targetJobOfferId: string) => {
      const result: {
        jobOfferId: string;
        name: string;
        title: string | null;
        hasSpeedReplyBadge: boolean;
        hasStaffVoice: boolean;
        hasWorkplaceInfo: boolean;
        mainPhotoUrl: string | null;
        photoCount: number;
        featureTags: string[];
        daysSinceUpdate: number | null;
        lastUpdatedAt: string | null;
      } = {
        jobOfferId: targetJobOfferId,
        name: '',
        title: null,
        hasSpeedReplyBadge: false,
        hasStaffVoice: false,
        hasWorkplaceInfo: false,
        mainPhotoUrl: null,
        photoCount: 0,
        featureTags: [],
        daysSinceUpdate: null,
        lastUpdatedAt: null,
      };

      const bodyText = document.body.innerText;

      // 求人名/タイトル
      const titleInput = document.querySelector('input[name*="title"], input[name*="job_title"]') as HTMLInputElement;
      if (titleInput) {
        result.title = titleInput.value || null;
        result.name = titleInput.value || '';
      }

      // スピード返信アイコンの有無
      const speedReplyKeywords = ['スピード返信', 'speed_reply', 'quick_reply', '24時間以内'];
      for (const keyword of speedReplyKeywords) {
        if (bodyText.includes(keyword)) {
          // チェックボックスや表示を確認
          const isChecked = document.querySelector('[class*="speed"][class*="badge"], [class*="speed-reply"].active, input[name*="speed"]:checked');
          if (isChecked) {
            result.hasSpeedReplyBadge = true;
            break;
          }
          // テキストで「表示中」「有効」を確認
          const keywordIndex = bodyText.indexOf(keyword);
          const contextText = bodyText.substring(keywordIndex, keywordIndex + 30);
          if (contextText.match(/(表示|有効|ON|あり)/)) {
            result.hasSpeedReplyBadge = true;
            break;
          }
        }
      }

      // 職員の声の有無
      const staffVoiceSection = document.querySelector('[class*="staff-voice"], [class*="employee"], [id*="staff"]');
      if (staffVoiceSection) {
        const content = staffVoiceSection.textContent || '';
        if (content.length > 10) {
          result.hasStaffVoice = true;
        }
      }
      // テキストで確認
      if (bodyText.includes('職員の声') || bodyText.includes('スタッフの声')) {
        const match = bodyText.match(/職員の声[：:\s]*(\d+)件/);
        if (match && parseInt(match[1], 10) > 0) {
          result.hasStaffVoice = true;
        }
      }

      // 職場環境情報の有無
      const workplaceKeywords = ['職場の環境', '職場環境', 'workplace'];
      for (const keyword of workplaceKeywords) {
        if (bodyText.includes(keyword)) {
          const workplaceSection = document.querySelector('[class*="workplace"], [class*="environment"]');
          if (workplaceSection && (workplaceSection.textContent || '').length > 10) {
            result.hasWorkplaceInfo = true;
            break;
          }
        }
      }

      // 写真枚数
      const photoElements = document.querySelectorAll('[class*="photo"] img, [class*="image"] img, .gallery img');
      result.photoCount = photoElements.length;

      // メイン写真URL
      if (photoElements.length > 0) {
        const firstPhoto = photoElements[0] as HTMLImageElement;
        result.mainPhotoUrl = firstPhoto.src || null;
      }

      // 特徴タグ
      const tagElements = document.querySelectorAll('[class*="tag"], [class*="feature"], .badge');
      tagElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 30 && !text.includes('円') && !text.includes('日')) {
          result.featureTags.push(text);
        }
      });

      // チェックされた特徴タグを取得
      const checkedFeatures = document.querySelectorAll('input[type="checkbox"][name*="feature"]:checked, input[type="checkbox"][name*="tag"]:checked');
      checkedFeatures.forEach(el => {
        const label = el.closest('label')?.textContent?.trim() || '';
        if (label && !result.featureTags.includes(label)) {
          result.featureTags.push(label);
        }
      });

      // 更新日/経過日数
      const updatePatterns = [
        /最終更新[：:\s]*(\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}日?)/,
        /更新日[：:\s]*(\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}日?)/,
        /(\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}日?)\s*(?:に)?更新/,
      ];

      for (const pattern of updatePatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          result.lastUpdatedAt = match[1];
          break;
        }
      }

      // 経過日数の直接取得
      const daysMatch = bodyText.match(/(?:更新から)?(\d+)\s*日(?:経過|前)/);
      if (daysMatch) {
        result.daysSinceUpdate = parseInt(daysMatch[1], 10);
      }

      return result;
    }, jobOfferId);

    // 日付を変換
    let lastUpdatedAt: Date | null = null;
    if (indicators.lastUpdatedAt) {
      const dateStr = indicators.lastUpdatedAt
        .replace(/年/g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '')
        .replace(/\//g, '-');
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        lastUpdatedAt = parsed;
      }
    }

    // 経過日数を計算（日付から）
    let daysSinceUpdate = indicators.daysSinceUpdate;
    if (!daysSinceUpdate && lastUpdatedAt) {
      const now = new Date();
      const diffTime = now.getTime() - lastUpdatedAt.getTime();
      daysSinceUpdate = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    console.log(`JobMedley Indicators [${jobOfferId}]: speedReply=${indicators.hasSpeedReplyBadge}, staffVoice=${indicators.hasStaffVoice}, photos=${indicators.photoCount}`);

    return {
      jobOfferId: indicators.jobOfferId,
      name: indicators.name,
      title: indicators.title,
      hasSpeedReplyBadge: indicators.hasSpeedReplyBadge,
      hasStaffVoice: indicators.hasStaffVoice,
      hasWorkplaceInfo: indicators.hasWorkplaceInfo,
      mainPhotoUrl: indicators.mainPhotoUrl,
      photoCount: indicators.photoCount,
      featureTags: indicators.featureTags,
      daysSinceUpdate,
      lastUpdatedAt,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error(`JobMedley: Error scraping indicators for ${jobOfferId}:`, error);
    return null;
  }
}

/**
 * 全求人の重要指標を一括取得
 */
export async function scrapeAllJobOfferIndicators(
  email: string,
  password: string
): Promise<{
  indicators: JobOfferIndicators[];
  scrapedAt: Date;
} | null> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    const loggedIn = await login(page, email, password);
    if (!loggedIn) {
      console.error('JobMedley: Login failed');
      return null;
    }

    // 求人リスト取得
    const jobOffers = await scrapeJobOfferList(page);
    console.log(`JobMedley: Found ${jobOffers.length} job offers for indicator scraping`);

    // 各求人の重要指標を取得
    const indicators: JobOfferIndicators[] = [];
    for (const jobOffer of jobOffers) {
      const indicator = await scrapeJobOfferIndicators(page, jobOffer.jobOfferId);
      if (indicator) {
        indicator.name = jobOffer.name;
        indicators.push(indicator);
      }
      // レート制限対策
      await page.waitForTimeout(1500);
    }

    return {
      indicators,
      scrapedAt: new Date(),
    };
  } catch (error) {
    console.error('JobMedley: Error scraping all job offer indicators:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
