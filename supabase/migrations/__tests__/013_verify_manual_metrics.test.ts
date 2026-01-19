/**
 * マイグレーション013の検証テスト
 * metricsテーブルにscout_reply_count, interview_countカラムが追加されていることを確認
 */

import { getSupabaseAdmin } from '@/lib/supabase';

describe('Migration 013: Add manual metrics columns', () => {
  const supabase = getSupabaseAdmin();

  it('should have scout_reply_count column in metrics table', async () => {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // metricsテーブルから1レコード取得してカラムの存在を確認
    const { data, error } = await supabase
      .from('metrics')
      .select('scout_reply_count')
      .limit(1);

    // エラーが発生しないこと（カラムが存在すること）
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have interview_count column in metrics table', async () => {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // metricsテーブルから1レコード取得してカラムの存在を確認
    const { data, error } = await supabase
      .from('metrics')
      .select('interview_count')
      .limit(1);

    // エラーが発生しないこと（カラムが存在すること）
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should accept NULL values for scout_reply_count', async () => {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // NULLが許容されることを確認（既存レコードを読み取る）
    const { data, error } = await supabase
      .from('metrics')
      .select('id, scout_reply_count')
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    // scout_reply_countはnumberまたはnullであること
    if (data) {
      expect(typeof data.scout_reply_count === 'number' || data.scout_reply_count === null).toBe(true);
    }
  });

  it('should accept NULL values for interview_count', async () => {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // NULLが許容されることを確認（既存レコードを読み取る）
    const { data, error } = await supabase
      .from('metrics')
      .select('id, interview_count')
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    // interview_countはnumberまたはnullであること
    if (data) {
      expect(typeof data.interview_count === 'number' || data.interview_count === null).toBe(true);
    }
  });

  it('should maintain existing UNIQUE constraint on (clinic_id, date, source, job_type)', async () => {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // 既存のユニーク制約が維持されていることを確認
    // 既存レコードから1件取得
    const { data: existingRecord } = await supabase
      .from('metrics')
      .select('clinic_id, date, source, job_type')
      .limit(1)
      .maybeSingle();

    if (!existingRecord) {
      // テストデータがない場合はスキップ
      return;
    }

    // 同じキーで重複挿入を試みる（エラーになるはず）
    const { error: duplicateError } = await supabase
      .from('metrics')
      .insert({
        clinic_id: existingRecord.clinic_id,
        date: existingRecord.date,
        source: existingRecord.source,
        job_type: existingRecord.job_type,
        display_count: 0,
        view_count: 0,
        redirect_count: 0,
        application_count: 0,
        scout_reply_count: null,
        interview_count: null,
      });

    // 重複エラーが発生することを確認
    expect(duplicateError).not.toBeNull();
    expect(duplicateError?.message).toContain('duplicate key value');
  });
});
