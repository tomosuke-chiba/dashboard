#!/usr/bin/env npx ts-node --transpile-only
/**
 * JobMedley日別データ定期取得スクリプト（Cronジョブ用）
 *
 * 毎日23:00 JSTに実行して日別データを更新
 *
 * Cron設定例:
 * 0 23 * * * cd /path/to/dashbord && npx ts-node --transpile-only scripts/cron-jobmedley-daily.ts >> logs/jobmedley-cron.log 2>&1
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// .env.localを読み込み
dotenv.config({ path: '.env.local' });

// 定数
const JOBMEDLEY_LOGIN_URL = 'https://customers.job-medley.com/customers/sign_in';
const JOBMEDLEY_ANALYSIS_URL = 'https://customers.job-medley.com/customers/analysis';
const JOBMEDLEY_STATISTICS_API = 'https://customers.job-medley.com/api/customers/statistics/total/';

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
    await page.goto(JOBMEDLEY_LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });

    const emailInput = await page.$('input[name="email"], input[type="email"], input[name="customer[email]"]');
    if (emailInput) {
      await emailInput.fill(email);
    } else {
      log('ERROR: Email input not found');
      return false;
    }

    const passwordInput = await page.$('input[name="password"], input[type="password"], input[name="customer[password]"]');
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

    if (page.url().includes('sign_in')) {
      log('ERROR: Login failed');
      return false;
    }

    return true;
  } catch (error) {
    log(`ERROR: Login exception: ${error}`);
    return false;
  }
}

// APIから日別メトリクスを取得
async function fetchDailyMetricsFromAPI(
  page: any,
  jobOfferId: string | null,
  year: number,
  month: number
): Promise<{ date: string; pageViewCount: number; applicationCountTotal: number; scoutApplicationCount: number }[]> {
  try {
    const params = new URLSearchParams({
      job_offer_id: jobOfferId || '',
      period_type: '2',
      target_year: '0',
    });

    const apiUrl = `${JOBMEDLEY_STATISTICS_API}?${params.toString()}`;

    const response = await page.evaluate(async (url: string) => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    }, apiUrl);

    if (!response || !response.statistics) {
      return [];
    }

    const stats = response.statistics;
    const dailyData: { date: string; pageViewCount: number; applicationCountTotal: number; scoutApplicationCount: number }[] = [];
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

    return dailyData;
  } catch (error) {
    log(`ERROR: API fetch failed: ${error}`);
    return [];
  }
}

// DBに日別データを保存
async function saveDailyMetricsToDb(
  supabase: any,
  clinicId: string,
  jobOfferId: string | null,
  dailyData: { date: string; pageViewCount: number; applicationCountTotal: number; scoutApplicationCount: number }[]
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
            sent_count: 0,
            scraped_at: new Date().toISOString(),
          },
          {
            onConflict: 'clinic_id,job_offer_id,date',
          }
        );

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
  log('=== JobMedley Daily Cron Job Started ===');

  const email = process.env.JOBMEDLEY_EMAIL;
  const password = process.env.JOBMEDLEY_PASSWORD;

  if (!email || !password) {
    log('ERROR: JOBMEDLEY_EMAIL and JOBMEDLEY_PASSWORD must be set');
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

  // 現在の年月
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  log(`Target period: ${year}/${month}`);

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

      // 分析ページに移動
      await page.goto(JOBMEDLEY_ANALYSIS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);

      // 全求人合算の日別データを取得
      const dailyData = await fetchDailyMetricsFromAPI(page, null, year, month);

      if (dailyData.length > 0) {
        const savedCount = await saveDailyMetricsToDb(supabase, clinic.id, null, dailyData);
        log(`  Saved ${savedCount}/${dailyData.length} records`);
      } else {
        log(`  No data retrieved`);
      }

      // レート制限対策
      await page.waitForTimeout(2000);
    }

    log('=== JobMedley Daily Cron Job Completed ===');

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
