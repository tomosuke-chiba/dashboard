#!/usr/bin/env npx ts-node --transpile-only
/**
 * Quacareer日別データ定期取得スクリプト（Cronジョブ用）
 *
 * 毎日23:00 JSTに実行してダッシュボード・スカウトメールデータを更新
 *
 * Cron設定例:
 * 5 23 * * * cd /path/to/dashbord && npx ts-node --transpile-only scripts/cron-quacareer-daily.ts >> logs/quacareer-cron.log 2>&1
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// .env.localを読み込み
dotenv.config({ path: '.env.local' });

// 定数
const QUACAREER_LOGIN_URL = 'https://customer.quacareer.com/login';
const QUACAREER_TOP_URL = 'https://customer.quacareer.com/';
const QUACAREER_SCOUT_URL = 'https://customer.quacareer.com/scout/maillist';

// ログ出力
function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Supabaseクライアント
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    log('ERROR: Supabase credentials not configured');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// ログイン処理
async function login(page: any, email: string, password: string): Promise<boolean> {
  try {
    await page.goto(QUACAREER_LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const emailInput = await page.$('input[name="email"], input[type="email"], input[id="email"]');
    if (emailInput) {
      await emailInput.fill(email);
    } else {
      log('ERROR: Email input not found');
      return false;
    }

    const passwordInput = await page.$('input[name="password"], input[type="password"], input[id="password"]');
    if (passwordInput) {
      await passwordInput.fill(password);
    } else {
      log('ERROR: Password input not found');
      return false;
    }

    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    }

    await page.waitForTimeout(5000);

    if (page.url().includes('login')) {
      log('ERROR: Login failed');
      return false;
    }

    return true;
  } catch (error) {
    log(`ERROR: Login exception: ${error}`);
    return false;
  }
}

// ダッシュボードデータを取得
async function scrapeDashboard(page: any): Promise<{
  totalApplicants: number;
  favoritesDH: number;
  favoritesDR: number;
  scoutMailOpenRate: number;
  scoutPlusOpenRate: number;
} | null> {
  try {
    // トップページに移動
    if (!page.url().includes('customer.quacareer.com') || page.url().includes('login')) {
      await page.goto(QUACAREER_TOP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await page.waitForTimeout(3000);

    const dashboardData = await page.evaluate(() => {
      const result = {
        totalApplicants: 0,
        favoritesDH: 0,
        favoritesDR: 0,
        scoutMailOpenRate: 0,
        scoutPlusOpenRate: 0,
      };

      const pageText = document.body.innerText;

      // 累計応募者数
      const applicantMatch = pageText.match(/累計応募者数[\s\S]*?(\d+)/);
      if (applicantMatch) {
        result.totalApplicants = parseInt(applicantMatch[1], 10);
      }

      // お気に入り（歯科衛生士）
      const dhMatch = pageText.match(/歯科衛生士[：:\s　]*(\d+)/);
      if (dhMatch) {
        result.favoritesDH = parseInt(dhMatch[1], 10);
      }

      // お気に入り（歯科医師）
      const drMatch = pageText.match(/歯科医師[：:\s　]*(\d+)/);
      if (drMatch) {
        result.favoritesDR = parseInt(drMatch[1], 10);
      }

      // スカウトメール開封率
      const scoutMailMatch = pageText.match(/スカウトメール平均開封率[\s\S]*?([\d.]+)\s*%/);
      if (scoutMailMatch) {
        result.scoutMailOpenRate = parseFloat(scoutMailMatch[1]);
      }

      // スカウトプラス開封率
      const scoutPlusMatch = pageText.match(/スカウトプラス平均開封率[\s\S]*?([\d.]+)\s*%/);
      if (scoutPlusMatch) {
        result.scoutPlusOpenRate = parseFloat(scoutPlusMatch[1]);
      }

      return result;
    });

    return dashboardData;
  } catch (error) {
    log(`ERROR: Dashboard scrape failed: ${error}`);
    return null;
  }
}

// スカウトメール一覧を取得
async function scrapeScoutMails(page: any): Promise<{
  deliveryDate: string;
  targetJobType: string;
  message: string;
  deliveryCount: number;
  openRate: number;
}[]> {
  try {
    await page.goto(QUACAREER_SCOUT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const scoutMails = await page.evaluate(() => {
      const results: {
        deliveryDate: string;
        targetJobType: string;
        message: string;
        deliveryCount: number;
        openRate: number;
      }[] = [];

      const tableRows = document.querySelectorAll('table tbody tr, .scout-list tr, .mail-list tr');

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

    return scoutMails;
  } catch (error) {
    log(`ERROR: Scout mails scrape failed: ${error}`);
    return [];
  }
}

// ダッシュボードデータをDBに保存
async function saveDashboardToDb(
  supabase: any,
  clinicId: string,
  data: {
    totalApplicants: number;
    favoritesDH: number;
    favoritesDR: number;
    scoutMailOpenRate: number;
    scoutPlusOpenRate: number;
  }
): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('quacareer_dashboard')
      .upsert(
        {
          clinic_id: clinicId,
          date: today,
          total_applicants: data.totalApplicants,
          favorites_dh: data.favoritesDH,
          favorites_dr: data.favoritesDR,
          scout_mail_open_rate: data.scoutMailOpenRate,
          scout_plus_open_rate: data.scoutPlusOpenRate,
          scraped_at: new Date().toISOString(),
        },
        {
          onConflict: 'clinic_id,date',
        }
      );

    if (error) {
      log(`ERROR: Dashboard save failed: ${error.message}`);
      return false;
    }

    return true;
  } catch (err) {
    log(`ERROR: Dashboard save exception: ${err}`);
    return false;
  }
}

// スカウトメールをDBに保存
async function saveScoutMailsToDb(
  supabase: any,
  clinicId: string,
  mails: {
    deliveryDate: string;
    targetJobType: string;
    message: string;
    deliveryCount: number;
    openRate: number;
  }[]
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  let savedCount = 0;

  // 今日のデータを削除（差し替え）
  await supabase
    .from('quacareer_scout_mails')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('scraped_date', today);

  for (const mail of mails) {
    try {
      const { error } = await supabase
        .from('quacareer_scout_mails')
        .insert({
          clinic_id: clinicId,
          scraped_date: today,
          delivery_date: mail.deliveryDate,
          target_job_type: mail.targetJobType,
          message: mail.message,
          delivery_count: mail.deliveryCount,
          open_rate: mail.openRate,
          scraped_at: new Date().toISOString(),
        });

      if (!error) {
        savedCount++;
      }
    } catch {
      // エラーは無視して続行
    }
  }

  return savedCount;
}

// メイン処理
async function main() {
  log('=== Quacareer Daily Cron Job Started ===');

  const email = process.env.QUACAREER_EMAIL;
  const password = process.env.QUACAREER_PASSWORD;

  if (!email || !password) {
    log('ERROR: QUACAREER_EMAIL and QUACAREER_PASSWORD must be set');
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    process.exit(1);
  }

  // 全クリニックを取得
  const { data: clinics, error: clinicError } = await supabase
    .from('clinics')
    .select('id, name, slug');

  if (clinicError || !clinics || clinics.length === 0) {
    log('ERROR: No clinics found');
    process.exit(1);
  }

  log(`Found ${clinics.length} clinics`);

  let browser: any = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    // ログイン
    log('Logging in...');
    const loggedIn = await login(page, email, password);
    if (!loggedIn) {
      process.exit(1);
    }
    log('Login successful');

    // 各クリニックのデータを取得
    for (const clinic of clinics) {
      log(`Processing: ${clinic.name} (${clinic.slug})`);

      // ダッシュボードデータを取得
      const dashboardData = await scrapeDashboard(page);
      if (dashboardData) {
        const saved = await saveDashboardToDb(supabase, clinic.id, dashboardData);
        log(`  Dashboard: ${saved ? 'saved' : 'failed'} (Applicants: ${dashboardData.totalApplicants})`);
      }

      // スカウトメール一覧を取得
      const scoutMails = await scrapeScoutMails(page);
      if (scoutMails.length > 0) {
        const savedCount = await saveScoutMailsToDb(supabase, clinic.id, scoutMails);
        log(`  Scout Mails: ${savedCount}/${scoutMails.length} saved`);
      } else {
        log(`  Scout Mails: no data`);
      }

      // レート制限対策
      await page.waitForTimeout(2000);
    }

    log('=== Quacareer Daily Cron Job Completed ===');

  } catch (error) {
    log(`ERROR: ${error}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 実行
main();
