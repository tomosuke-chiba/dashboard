/**
 * Bitly & スカウトデータ確認スクリプト
 *
 * 使用方法:
 * npx ts-node scripts/check-bitly-scout-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('=== Bitly & スカウトデータ確認 ===\n');

  // 1. クリニック一覧
  const { data: clinics } = await supabase
    .from('clinics')
    .select('id, name, slug, bitly_url')
    .order('name');

  console.log('1. クリニック一覧');
  console.log('---');
  for (const c of clinics || []) {
    console.log(`   ${c.name}: bitly_url=${c.bitly_url || 'なし'}`);
  }

  // 2. スカウトメッセージデータ
  console.log('\n2. スカウトメッセージデータ');
  console.log('---');
  const { data: scouts } = await supabase
    .from('scout_messages')
    .select('clinic_id, date, sent_count, reply_count')
    .order('date', { ascending: false })
    .limit(20);

  if (scouts && scouts.length > 0) {
    // クリニックIDから名前を取得
    const clinicMap = new Map((clinics || []).map(c => [c.id, c.name]));
    for (const s of scouts) {
      const clinicName = clinicMap.get(s.clinic_id) || 'Unknown';
      console.log(`   ${s.date}: ${clinicName} - 送信${s.sent_count}通, 返信${s.reply_count}通`);
    }
  } else {
    console.log('   データなし');
  }

  // 3. Bitlyクリックデータ
  console.log('\n3. Bitlyクリックデータ');
  console.log('---');
  const { data: bitly } = await supabase
    .from('bitly_clicks')
    .select('clinic_id, date, click_count')
    .order('date', { ascending: false })
    .limit(20);

  if (bitly && bitly.length > 0) {
    const clinicMap = new Map((clinics || []).map(c => [c.id, c.name]));
    for (const b of bitly) {
      const clinicName = clinicMap.get(b.clinic_id) || 'Unknown';
      console.log(`   ${b.date}: ${clinicName} - ${b.click_count}クリック`);
    }
  } else {
    console.log('   データなし');
  }

  // 4. 月別集計（板東歯科医院の12月）
  console.log('\n4. 月別集計サンプル（板東歯科医院・2025年12月）');
  console.log('---');

  const bandoClinic = (clinics || []).find(c => c.name.includes('板東'));
  if (bandoClinic) {
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';

    // スカウト集計
    const { data: monthlyScout } = await supabase
      .from('scout_messages')
      .select('sent_count, reply_count')
      .eq('clinic_id', bandoClinic.id)
      .gte('date', startDate)
      .lte('date', endDate);

    const totalSent = (monthlyScout || []).reduce((sum, s) => sum + s.sent_count, 0);
    const totalReply = (monthlyScout || []).reduce((sum, s) => sum + s.reply_count, 0);
    console.log(`   スカウト送信数: ${totalSent}通`);
    console.log(`   スカウト返信数: ${totalReply}通`);

    // Bitly集計
    const { data: monthlyBitly } = await supabase
      .from('bitly_clicks')
      .select('click_count')
      .eq('clinic_id', bandoClinic.id)
      .gte('date', startDate)
      .lte('date', endDate);

    const totalClicks = (monthlyBitly || []).reduce((sum, b) => sum + b.click_count, 0);
    console.log(`   Bitlyクリック数: ${totalClicks}回`);

    // クリック率計算
    const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0';
    console.log(`   Bitlyクリック率: ${clickRate}%`);
  } else {
    console.log('   板東歯科医院が見つかりません');
  }

  console.log('\n=== 確認完了 ===');
}

checkData();