/**
 * 1クリニックのみでスクレイピング→DB保存をテスト
 *
 * 使用方法:
 * npx ts-node scripts/test-single-clinic-scrape.ts
 */

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GUPPY関連
const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_ACCESS_LOG_URL = 'https://www.guppy.jp/service/access_logs';

// テスト用ログイン情報（津谷歯科医院）
// TEST_CLINIC_IDはDBから取得
const TEST_LOGIN_ID = '0886556471';
const TEST_PASSWORD = 'r6p6f67x';

// 型定義
type JobType = 'dr' | 'dh' | 'da' | 'reception' | 'technician' | 'dietitian' | 'nursery' | 'kindergarten' | 'medical_clerk';

interface JobListing {
  id: string;
  name: string;
  jobType: JobType | null;
}

interface AccessLogEntry {
  date: string;
  displayCount: number;
  viewCount: number;
  redirectCount: number;
  applicationCount: number;
}

// 職種判定キーワード
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

function getMonthsToScrape(monthsBack: number = 1): { year: number; month: number }[] {
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

async function testSingleClinicScrape() {
  console.log('=== 1クリニック限定 スクレイピング→DB保存テスト ===\n');

  // 1. テスト対象クリニックをDBから取得
  console.log('1. テスト対象クリニックを取得中...');
  const { data: clinics, error: clinicError } = await supabase
    .from('clinics')
    .select('*')
    .eq('guppy_login_id', TEST_LOGIN_ID)
    .limit(1);

  if (clinicError || !clinics || clinics.length === 0) {
    console.error('   クリニック取得失敗:', clinicError);
    return;
  }

  const clinic = clinics[0];
  console.log(`   クリニック: ${clinic.name} (ID: ${clinic.id})`);

  let browser = null;

  try {
    // 2. ブラウザ起動・ログイン
    console.log('\n2. ブラウザ起動・ログイン...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await page.goto(GUPPY_LOGIN_URL, { waitUntil: 'networkidle' });
    await page.fill('input[name="data[Account][login_id]"]', TEST_LOGIN_ID);
    await page.fill('input[name="data[Account][password]"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('login')) {
      console.error('   ❌ ログイン失敗');
      return;
    }
    console.log('   ✅ ログイン成功');

    // 3. 今月のアクセスログページに移動
    const months = getMonthsToScrape(1); // 今月のみ
    const firstMonth = months[0];
    const monthStr = String(firstMonth.month).padStart(2, '0');
    const accessLogUrl = `${GUPPY_ACCESS_LOG_URL}/${firstMonth.year}-${monthStr}`;

    console.log(`\n3. アクセスログページに移動: ${accessLogUrl}`);
    await page.goto(accessLogUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 4. 求人ID一覧を抽出
    console.log('\n4. 求人ID一覧を抽出中...');
    const rawListings: { id: string; name: string; jobType: null }[] = await page.evaluate(() => {
      const select = document.querySelector('select') as HTMLSelectElement | null;
      if (!select) return [];

      const listings: { id: string; name: string; jobType: null }[] = [];
      const options = select.querySelectorAll('option');

      options.forEach((option) => {
        const text = option.textContent?.trim() || '';
        const match = text.match(/\[(\d+)\]/);
        if (match && match[1]) {
          listings.push({
            id: match[1],
            name: text.replace(/\[\d+\]/, '').trim(),
            jobType: null,
          });
        }
      });

      return listings;
    });

    const jobListings: JobListing[] = rawListings.map((listing) => ({
      ...listing,
      jobType: detectJobTypeFromName(listing.name),
    }));

    console.log(`   求人数: ${jobListings.length}件`);
    jobListings.forEach((j) => console.log(`   - ${j.name} (${j.jobType || '不明'})`));

    // 5. 合計データを取得（ドロップダウンで「すべて」の状態）
    console.log('\n5. 合計データ（全求人）を取得中...');
    const allAccessLogs: AccessLogEntry[] = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return [];

      const rows = table.querySelectorAll('tr');
      const results: { date: string; displayCount: number; viewCount: number; redirectCount: number; applicationCount: number }[] = [];

      rows.forEach((row, index) => {
        if (index === 0) return;
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const parseNumber = (text: string) => parseInt(text.replace(/[^0-9]/g, '') || '0', 10);
          const date = cells[0]?.textContent?.trim() || '';
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

    console.log(`   合計データ: ${allAccessLogs.length}日分`);

    // 6. 合計データをDBに保存（job_type = null）
    console.log('\n6. 合計データをDBに保存中...');
    let savedCount = 0;
    for (const log of allAccessLogs) {
      const { error: upsertError } = await supabase
        .from('metrics')
        .upsert({
          clinic_id: clinic.id,
          date: log.date,
          source: 'guppy',
          job_type: null, // 合計値
          display_count: log.displayCount,
          view_count: log.viewCount,
          redirect_count: log.redirectCount,
          application_count: log.applicationCount,
        }, {
          onConflict: 'clinic_id,date,source,job_type'
        });

      if (upsertError) {
        console.error(`   ❌ ${log.date} 保存失敗:`, upsertError.message);
      } else {
        savedCount++;
      }
    }
    console.log(`   ✅ 合計データ保存完了: ${savedCount}/${allAccessLogs.length}件`);

    // 7. 職種別データを取得して保存
    console.log('\n7. 職種別データを取得・保存中...');

    // 職種ごとにグループ化
    const jobTypeGroups: Map<JobType, JobListing[]> = new Map();
    for (const listing of jobListings) {
      if (listing.jobType) {
        const existing = jobTypeGroups.get(listing.jobType) || [];
        existing.push(listing);
        jobTypeGroups.set(listing.jobType, existing);
      }
    }

    for (const [jobType, listings] of jobTypeGroups) {
      console.log(`\n   --- ${jobType} ---`);

      // 同じ職種の全求人のデータを合算
      const dateMap = new Map<string, AccessLogEntry>();

      for (const listing of listings) {
        const jobUrl = `${GUPPY_ACCESS_LOG_URL}/${firstMonth.year}-${monthStr}/${listing.id}`;
        await page.goto(jobUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const jobLogs: AccessLogEntry[] = await page.evaluate(() => {
          const table = document.querySelector('table');
          if (!table) return [];

          const rows = table.querySelectorAll('tr');
          const results: { date: string; displayCount: number; viewCount: number; redirectCount: number; applicationCount: number }[] = [];

          rows.forEach((row, index) => {
            if (index === 0) return;
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
              const parseNumber = (text: string) => parseInt(text.replace(/[^0-9]/g, '') || '0', 10);
              const date = cells[0]?.textContent?.trim() || '';
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

        console.log(`   ${listing.name}: ${jobLogs.length}日分`);

        // 日付ごとに合算
        for (const log of jobLogs) {
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
      }

      // DBに保存
      const aggregatedLogs = Array.from(dateMap.values());
      let jobTypeSavedCount = 0;

      for (const log of aggregatedLogs) {
        const { error: upsertError } = await supabase
          .from('metrics')
          .upsert({
            clinic_id: clinic.id,
            date: log.date,
            source: 'guppy',
            job_type: jobType, // 職種別
            display_count: log.displayCount,
            view_count: log.viewCount,
            redirect_count: log.redirectCount,
            application_count: log.applicationCount,
          }, {
            onConflict: 'clinic_id,date,source,job_type'
          });

        if (upsertError) {
          console.error(`   ❌ ${jobType} ${log.date} 保存失敗:`, upsertError.message);
        } else {
          jobTypeSavedCount++;
        }
      }

      console.log(`   ✅ ${jobType} 保存完了: ${jobTypeSavedCount}件`);
    }

    // 8. DB確認
    console.log('\n8. DB確認...');
    const { data: savedMetrics, error: metricsError } = await supabase
      .from('metrics')
      .select('job_type, count')
      .eq('clinic_id', clinic.id)
      .gte('date', `${firstMonth.year}-${monthStr}-01`);

    if (metricsError) {
      console.error('   メトリクス取得失敗:', metricsError);
    } else {
      // job_type別にカウント
      const counts: Record<string, number> = {};
      (savedMetrics || []).forEach((m: { job_type: string | null }) => {
        const key = m.job_type || 'null (合計)';
        counts[key] = (counts[key] || 0) + 1;
      });

      console.log('   === 保存されたデータ ===');
      Object.entries(counts).forEach(([jobType, count]) => {
        console.log(`   ${jobType}: ${count}件`);
      });
    }

    console.log('\n=== テスト完了 ✅ ===');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testSingleClinicScrape();