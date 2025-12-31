import { chromium, Browser, Page } from 'playwright';

const JOBMEDLEY_LOGIN_URL = 'https://customers.job-medley.com/customers/sign_in';
const JOBMEDLEY_ANALYSIS_URL = 'https://customers.job-medley.com/customers/analysis';
const JOBMEDLEY_MESSAGES_URL = 'https://customers.job-medley.com/customers/messages';

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
