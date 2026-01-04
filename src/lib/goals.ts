/**
 * 目標採用人数管理ユーティリティ
 * Phase B: 目標採用人数管理
 */

import { SupabaseClient } from '@supabase/supabase-js';

// 職種の定義
export const JOB_TYPES = [
  { value: 'dr', label: '歯科医師' },
  { value: 'dh', label: '歯科衛生士' },
  { value: 'da', label: '歯科助手' },
  { value: 'receptionist', label: '受付' },
  { value: 'technician', label: '歯科技工士' },
  { value: 'dietitian', label: '管理栄養士' },
  { value: 'nursery', label: '保育士' },
  { value: 'kindergarten', label: '幼稚園教諭' },
  { value: 'medical_clerk', label: '医療事務' },
] as const;

export type JobType = typeof JOB_TYPES[number]['value'];

// 媒体の定義
export const SOURCES = [
  { value: 'guppy', label: 'GUPPY' },
  { value: 'jobmedley', label: 'ジョブメドレー' },
  { value: 'quacareer', label: 'クオキャリア' },
  { value: 'other', label: 'その他' },
] as const;

export type Source = typeof SOURCES[number]['value'];

// 経路の定義
export const CHANNELS = [
  { value: 'scout', label: 'スカウト' },
  { value: 'application', label: '求人応募' },
  { value: 'direct', label: '直接応募' },
  { value: 'referral', label: '紹介' },
  { value: 'other', label: 'その他' },
] as const;

export type Channel = typeof CHANNELS[number]['value'];

// 型定義
export interface RecruitmentGoal {
  id: string;
  clinicId: string;
  contractStartDate: string;
  contractDurationMonths: number;
  jobType: JobType;
  targetCount: number;
  currentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hire {
  id: string;
  clinicId: string;
  hireDate: string;
  jobType: JobType;
  source: Source;
  channel: Channel | null;
  name: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  goal: RecruitmentGoal;
  progressRate: number;
  remainingCount: number;
  remainingDays: number;
  isOnTrack: boolean;
  expectedCompletionRate: number;
}

/**
 * 目標一覧を取得
 */
export async function getGoals(
  supabase: SupabaseClient,
  clinicId: string
): Promise<RecruitmentGoal[]> {
  const { data, error } = await supabase
    .from('recruitment_goals')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('job_type', { ascending: true });

  if (error) {
    console.error('Error fetching goals:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    clinicId: row.clinic_id,
    contractStartDate: row.contract_start_date,
    contractDurationMonths: row.contract_duration_months,
    jobType: row.job_type,
    targetCount: row.target_count,
    currentCount: row.current_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 目標を設定/更新
 */
export async function upsertGoal(
  supabase: SupabaseClient,
  clinicId: string,
  goal: {
    jobType: JobType;
    targetCount: number;
    contractStartDate: string;
    contractDurationMonths?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('recruitment_goals')
    .upsert(
      {
        clinic_id: clinicId,
        job_type: goal.jobType,
        target_count: goal.targetCount,
        contract_start_date: goal.contractStartDate,
        contract_duration_months: goal.contractDurationMonths || 12,
      },
      {
        onConflict: 'clinic_id,job_type',
      }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 目標を削除
 */
export async function deleteGoal(
  supabase: SupabaseClient,
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('recruitment_goals')
    .delete()
    .eq('id', goalId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 採用決定を登録
 */
export async function createHire(
  supabase: SupabaseClient,
  hire: {
    clinicId: string;
    hireDate: string;
    jobType: JobType;
    source: Source;
    channel?: Channel;
    name?: string;
    memo?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('hires')
    .insert({
      clinic_id: hire.clinicId,
      hire_date: hire.hireDate,
      job_type: hire.jobType,
      source: hire.source,
      channel: hire.channel || null,
      name: hire.name || null,
      memo: hire.memo || null,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * 採用決定一覧を取得
 */
export async function getHires(
  supabase: SupabaseClient,
  clinicId: string,
  options?: {
    jobType?: JobType;
    source?: Source;
    fromDate?: string;
    toDate?: string;
  }
): Promise<Hire[]> {
  let query = supabase
    .from('hires')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('hire_date', { ascending: false });

  if (options?.jobType) {
    query = query.eq('job_type', options.jobType);
  }
  if (options?.source) {
    query = query.eq('source', options.source);
  }
  if (options?.fromDate) {
    query = query.gte('hire_date', options.fromDate);
  }
  if (options?.toDate) {
    query = query.lte('hire_date', options.toDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching hires:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    clinicId: row.clinic_id,
    hireDate: row.hire_date,
    jobType: row.job_type,
    source: row.source,
    channel: row.channel,
    name: row.name,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 採用決定を削除
 */
export async function deleteHire(
  supabase: SupabaseClient,
  hireId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('hires')
    .delete()
    .eq('id', hireId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 進捗率を計算
 */
export function calculateProgress(goal: RecruitmentGoal): GoalProgress {
  const now = new Date();
  const startDate = new Date(goal.contractStartDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + goal.contractDurationMonths);

  // 残り日数
  const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // 経過日数と全体日数
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  // 進捗率
  const progressRate = goal.targetCount > 0 ? goal.currentCount / goal.targetCount : 0;

  // 残り人数
  const remainingCount = Math.max(0, goal.targetCount - goal.currentCount);

  // 期待進捗率（経過時間ベース）
  const expectedCompletionRate = totalDays > 0 ? elapsedDays / totalDays : 0;

  // 順調かどうか（実際の進捗 >= 期待進捗）
  const isOnTrack = progressRate >= expectedCompletionRate;

  return {
    goal,
    progressRate,
    remainingCount,
    remainingDays,
    isOnTrack,
    expectedCompletionRate,
  };
}

/**
 * 全目標の進捗を取得
 */
export async function getGoalsWithProgress(
  supabase: SupabaseClient,
  clinicId: string
): Promise<GoalProgress[]> {
  const goals = await getGoals(supabase, clinicId);
  return goals.map(calculateProgress);
}
