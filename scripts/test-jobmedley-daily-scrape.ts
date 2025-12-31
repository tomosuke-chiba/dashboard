/**
 * JobMedley日別データ取得＆DB保存テストスクリプト
 *
 * 使用方法:
 * npx ts-node --transpile-only scripts/test-jobmedley-daily-scrape.ts
 * DEBUG=true npx ts-node --transpile-only scripts/test-jobmedley-daily-scrape.ts  # ブラウザ表示
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// .env.localを読み込み
dotenv.config({ path: '.env.local' });

// 定数
const JOBMEDLEY_LOGIN_URL = 'https://customers.job-medley.com/customers/sign_in';
const JOBMEDLEY_ANALYSIS_URL = 'https://customers.job-medley.com/customers/analysis';
const JOBMEDLEY_STATISTICS_API = 'https://customers.job-medley.com/api/customers/statistics/total/';

// 型定義
interface DailyMetricData {
  date: string;
  pageViewCount: number;
  applicationCountTotal: number;
  scoutApplicationCount: number;
}

interface JobOfferData {
  jobOfferId: string;
  name: string;
}

// Supabaseクライアント
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase credentials not configured');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// ログイン処理
async function login(page: any, email: string, password: string): Promise<boolean> {
  try {
    console.log('  ログインページに移動中...');
    await page.goto(JOBMEDLEY_LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // メールアドレス入力
    const emailInput = await page.$('input[name="email"], input[type="email"], input[name="customer[email]"]');
    if (emailInput) {
      await emailInput.fill(email);
    } else {
      console.error('  メールアドレス入力欄が見つかりません');
      return false;
    }

    // パスワード入力
    const passwordInput = await page.$('input[name="password"], input[type="password"], input[name="customer[password]"]');
    if (passwordInput) {
      await passwordInput.fill(password);
    } else {
      console.error('  パスワード入力欄が見つかりません');
      return false;
    }

    // ログインボタンクリック
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    }

    await page.waitForTimeout(5000);

    // ログイン確認
    if (page.url().includes('sign_in')) {
      console.error('  ログイン失敗');
      return false;
    }

    console.log('  ログイン成功!');
    return true;
  } catch (error) {
    console.error('  ログインエラー:', error);
    return false;
  }
}

// APIから日別メトリクスを取得
async function fetchDailyMetricsFromAPI(
  page: any,
  jobOfferId: string | null,
  year: number,
  month: number
): Promise<DailyMetricData[]> {
  try {
    const params = new URLSearchParams({
      job_offer_id: jobOfferId || '',
      period_type: '2',
      target_year: '0',
    });

    const apiUrl = `${JOBMEDLEY_STATISTICS_API}?${params.toString()}`;
    console.log(`  API呼び出し: ${apiUrl}`);

    const response = await page.evaluate(async (url: string) => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
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
      console.error('  APIレスポンスが不正');
      return [];
    }

    const stats = response.statistics;
    const dailyData: DailyMetricData[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const pvData = stats.pv_data?.find((d: { label: number }) => d.label === day);
      const applyData = stats.apply_data?.find((d: { label: number }) => d.label === day);
      const scoutApplyData = stats.apply_from_scout_data?.find((d: { label: number }) => d.label === day);

      dailyData.push({
        date: dateStr,
        pageViewCount: pvData?.count ?? 0,
        applicationCountTotal: applyData?.count ?? 0,
        scoutApplicationCount: scoutApplyData?.count ?? 0,
      });
    }

    console.log(`  取得件数: ${dailyData.length}件`);
    return dailyData;
  } catch (error) {
    console.error('  APIエラー:', error);
    return [];
  }
}

// 求人リストを取得
async function scrapeJobOfferList(page: any): Promise<JobOfferData[]> {
  try {
    console.log('  求人リスト取得中...');
    await page.goto(JOBMEDLEY_ANALYSIS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const jobOffers = await page.evaluate(() => {
      const results: { jobOfferId: string; name: string }[] = [];

      const select = document.querySelector('select[name="job_offer_id"], select#job_offer_id') as HTMLSelectElement;
      if (select) {
        const options = Array.from(select.options);
        for (const option of options) {
          const value = option.value;
          const text = option.textContent?.trim() || '';
          if (value && value !== '' && text && !text.includes('選択') && !text.includes('全て')) {
            results.push({ jobOfferId: value, name: text });
          }
        }
      }

      return results;
    });

    console.log(`  求人数: ${jobOffers.length}件`);
    return jobOffers;
  } catch (error) {
    console.error('  求人リスト取得エラー:', error);
    return [];
  }
}

// DBに日別データを保存
async function saveDailyMetricsToDb(
  supabase: any,
  clinicId: string,
  jobOfferId: string | null,
  dailyData: DailyMetricData[]
): Promise<number> {
  let savedCount = 0;

  for (const data of dailyData) {
    try {
      const { error } = await supabase
        .from('jobmedley_scouts')
        .upsert(
          {
            clinic_id: clinicId,
            job_offer_id: jobOfferId,
            date: data.date,
            page_view_count: data.pageViewCount,
            application_count_total: data.applicationCountTotal,
            scout_application_count: data.scoutApplicationCount,
            sent_count: 0,  // 後でホバーで取得
          },
          {
            onConflict: 'clinic_id,job_offer_id,date',
          }
        );

      if (error) {
        console.error(`  保存エラー (${data.date}):`, error.message);
      } else {
        savedCount++;
      }
    } catch (err) {
      console.error(`  保存例外 (${data.date}):`, err);
    }
  }

  return savedCount;
}

// 求人マスタをDBに保存
async function saveJobOffersToDb(
  supabase: any,
  clinicId: string,
  jobOffers: JobOfferData[]
): Promise<number> {
  let savedCount = 0;

  for (const jobOffer of jobOffers) {
    try {
      const { error } = await supabase
        .from('jobmedley_job_offers')
        .upsert(
          {
            clinic_id: clinicId,
            job_offer_id: jobOffer.jobOfferId,
            name: jobOffer.name,
          },
          {
            onConflict: 'clinic_id,job_offer_id',
          }
        );

      if (error) {
        console.error(`  求人保存エラー (${jobOffer.name}):`, error.message);
      } else {
        savedCount++;
      }
    } catch (err) {
      console.error(`  求人保存例外 (${jobOffer.name}):`, err);
    }
  }

  return savedCount;
}

// メイン処理
async function main() {
  console.log('=== JobMedley日別データ取得テスト ===\n');

  // 環境変数チェック
  const email = process.env.JOBMEDLEY_EMAIL;
  const password = process.env.JOBMEDLEY_PASSWORD;

  if (!email || !password) {
    console.error('JOBMEDLEY_EMAIL と JOBMEDLEY_PASSWORD を .env.local に設定してください');
    process.exit(1);
  }

  // Supabaseクライアント
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('Supabase接続に失敗しました');
    process.exit(1);
  }

  // クリニックを取得（テスト用に最初の1件）
  console.log('1. クリニック情報を取得中...');
  const { data: clinics, error: clinicError } = await supabase
    .from('clinics')
    .select('id, name, slug')
    .limit(1);

  if (clinicError || !clinics || clinics.length === 0) {
    console.error('クリニックが見つかりません:', clinicError?.message);
    process.exit(1);
  }

  const clinic = clinics[0];
  console.log(`  クリニック: ${clinic.name} (${clinic.slug})`);

  // 現在の年月
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  console.log(`  対象期間: ${year}年${month}月\n`);

  const isDebug = process.env.DEBUG === 'true';
  let browser: any = null;

  try {
    console.log('2. ブラウザを起動中...');
    browser = await chromium.launch({ headless: !isDebug });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // ログイン
    console.log('\n3. ログイン中...');
    const loggedIn = await login(page, email, password);
    if (!loggedIn) {
      console.error('ログインに失敗しました');
      process.exit(1);
    }

    // 分析ページに移動
    console.log('\n4. 分析ページに移動中...');
    await page.goto(JOBMEDLEY_ANALYSIS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 求人リスト取得
    console.log('\n5. 求人リスト取得中...');
    const jobOffers = await scrapeJobOfferList(page);

    if (jobOffers.length > 0) {
      console.log('  求人リスト:');
      jobOffers.forEach((jo: JobOfferData, i: number) => console.log(`    ${i + 1}. ${jo.name} (ID: ${jo.jobOfferId})`));

      // 求人マスタをDBに保存
      console.log('\n6. 求人マスタをDBに保存中...');
      const savedJobOffers = await saveJobOffersToDb(supabase, clinic.id, jobOffers);
      console.log(`  保存件数: ${savedJobOffers}件`);
    }

    // 全求人合算の日別データ取得
    console.log('\n7. 全求人合算の日別データを取得中...');
    const allDailyData = await fetchDailyMetricsFromAPI(page, null, year, month);

    if (allDailyData.length > 0) {
      console.log('  日別データサンプル（最初の5件）:');
      allDailyData.slice(0, 5).forEach((d: DailyMetricData) => {
        console.log(`    ${d.date}: PV=${d.pageViewCount}, 応募=${d.applicationCountTotal}, スカウト応募=${d.scoutApplicationCount}`);
      });

      // DBに保存
      console.log('\n8. 全求人合算データをDBに保存中...');
      const savedCount = await saveDailyMetricsToDb(supabase, clinic.id, null, allDailyData);
      console.log(`  保存件数: ${savedCount}/${allDailyData.length}件`);
    }

    // 各求人の日別データ取得（最初の1件のみ）
    if (jobOffers.length > 0) {
      const firstJobOffer = jobOffers[0];
      console.log(`\n9. 求人別データ取得中: ${firstJobOffer.name}...`);
      const jobDailyData = await fetchDailyMetricsFromAPI(page, firstJobOffer.jobOfferId, year, month);

      if (jobDailyData.length > 0) {
        console.log('  日別データサンプル（最初の5件）:');
        jobDailyData.slice(0, 5).forEach((d: DailyMetricData) => {
          console.log(`    ${d.date}: PV=${d.pageViewCount}, 応募=${d.applicationCountTotal}, スカウト応募=${d.scoutApplicationCount}`);
        });

        // DBに保存
        console.log('\n10. 求人別データをDBに保存中...');
        const savedCount = await saveDailyMetricsToDb(supabase, clinic.id, firstJobOffer.jobOfferId, jobDailyData);
        console.log(`  保存件数: ${savedCount}/${jobDailyData.length}件`);
      }
    }

    // デバッグモードの場合は待機
    if (isDebug) {
      console.log('\n[デバッグモード] ブラウザを60秒間表示します...');
      await page.waitForTimeout(60000);
    }

    console.log('\n=== テスト完了 ===');
    console.log('Supabase Dashboardでデータを確認してください');
    console.log('フロントエンドでの表示確認: http://localhost:3000/clinic/' + clinic.slug + '/job-medley');

  } catch (error) {
    console.error('\nエラーが発生しました:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 実行
main();
