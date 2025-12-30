/**
 * スカウトメールデータ取得→DB保存テスト
 *
 * 使用方法:
 * npx ts-node scripts/test-scout-db-save.ts
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

const GUPPY_LOGIN_URL = 'https://www.guppy.jp/service/login';
const GUPPY_MESSAGE_THREAD_URL = 'https://www.guppy.jp/service/message_thread';

// テスト用ログイン情報（津谷歯科医院）
const TEST_LOGIN_ID = '0886556471';
const TEST_PASSWORD = 'r6p6f67x';

// 職種マッピング
const JOB_TYPE_MAP: Record<string, string> = {
  'DH': 'dh',
  'DR': 'dr',
  'DA': 'da',
};

interface ScoutEntry {
  date: string;
  jobType: string | null;
  memo: string;
}

interface DailyScoutData {
  date: string;
  sentCount: number;
  replyCount: number;
}

function parseScoutMemo(memo: string, createdDate: string): ScoutEntry | null {
  const year = createdDate.split('.')[0];
  const dateMatch = memo.match(/^(\d{4})/);
  if (!dateMatch) return null;

  const mmdd = dateMatch[1];
  const month = mmdd.substring(0, 2);
  const day = mmdd.substring(2, 4);
  const date = `${year}-${month}-${day}`;

  let jobType: string | null = null;
  for (const [key, value] of Object.entries(JOB_TYPE_MAP)) {
    if (memo.toUpperCase().includes(key.toUpperCase())) {
      jobType = value;
      break;
    }
  }

  return { date, jobType, memo };
}

async function testScoutDbSave() {
  console.log('=== スカウトメール → DB保存テスト ===\n');

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
    await page.waitForTimeout(3000);

    if (page.url().includes('login')) {
      console.error('   ❌ ログイン失敗');
      return;
    }
    console.log('   ✅ ログイン成功');

    // 3. スカウト未返信ページに移動
    console.log('\n3. スカウト未返信ページに移動...');
    await page.goto(`${GUPPY_MESSAGE_THREAD_URL}?filter_tab=scout_no_reply`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 4. 全件読み込み
    console.log('\n4. 全件読み込み中...');
    while (true) {
      const loadMoreButton = await page.$('a.mod-button:has-text("もっと見る"), button:has-text("もっと見る")');
      if (loadMoreButton) {
        await loadMoreButton.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }

    // 5. スカウトメモを抽出
    console.log('\n5. スカウトメモを抽出中...');
    const scoutMemos = await page.evaluate(() => {
      const memos: { memo: string; created: string }[] = [];

      const memoLists = document.querySelectorAll('.scout-memo-list');
      memoLists.forEach((list) => {
        const items = list.querySelectorAll('li.list-memo-body');
        items.forEach((item) => {
          const memoText = item.childNodes[0]?.textContent?.trim() || '';
          const createdSpan = item.querySelector('.list-memo-created');
          const created = createdSpan?.textContent?.trim() || '';

          if (memoText && created) {
            memos.push({ memo: memoText, created });
          }
        });
      });

      return memos;
    });

    console.log(`   抽出されたメモ数: ${scoutMemos.length}件`);

    // 6. メモをパースして日別に集計
    const scoutEntries: ScoutEntry[] = [];
    for (const { memo, created } of scoutMemos) {
      const entry = parseScoutMemo(memo, created);
      if (entry && memo.includes('スカウト')) {
        scoutEntries.push(entry);
      }
    }

    console.log(`   スカウトエントリ数: ${scoutEntries.length}件`);

    // 日別に集計
    const dailyCountsMap = new Map<string, number>();
    for (const entry of scoutEntries) {
      dailyCountsMap.set(entry.date, (dailyCountsMap.get(entry.date) || 0) + 1);
    }

    const dailyData: DailyScoutData[] = Array.from(dailyCountsMap.entries()).map(([date, sentCount]) => ({
      date,
      sentCount,
      replyCount: 0,
    }));

    console.log('\n   === 日別スカウト送信数 ===');
    dailyData.sort((a, b) => b.date.localeCompare(a.date));
    dailyData.forEach((d) => {
      console.log(`   ${d.date}: ${d.sentCount}通`);
    });

    // 7. DBに保存
    console.log('\n6. DBに保存中...');
    let savedCount = 0;

    for (const dayData of dailyData) {
      const { error: upsertError } = await supabase
        .from('scout_messages')
        .upsert({
          clinic_id: clinic.id,
          date: dayData.date,
          source: 'guppy',
          sent_count: dayData.sentCount,
          reply_count: dayData.replyCount,
        }, {
          onConflict: 'clinic_id,date,source'
        });

      if (upsertError) {
        console.error(`   ❌ ${dayData.date} 保存失敗:`, upsertError.message);
      } else {
        savedCount++;
      }
    }

    console.log(`   ✅ 保存完了: ${savedCount}/${dailyData.length}件`);

    // 8. DB確認
    console.log('\n7. DB確認...');
    const { data: savedScout, error: scoutError } = await supabase
      .from('scout_messages')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('date', { ascending: false });

    if (scoutError) {
      console.error('   取得失敗:', scoutError);
    } else {
      console.log(`   === 保存されたスカウトデータ (${savedScout?.length || 0}件) ===`);
      (savedScout || []).slice(0, 10).forEach((s) => {
        console.log(`   ${s.date}: 送信${s.sent_count}通, 返信${s.reply_count}通`);
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

testScoutDbSave();