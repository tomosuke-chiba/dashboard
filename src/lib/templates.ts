/**
 * スカウト文面・バナー管理ユーティリティ
 * Phase C: スカウト文面・バナー管理
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { JOB_TYPES, JobType } from './goals';

// ============================================
// 型定義
// ============================================

export interface GuppyScoutTemplate {
  id: string;
  clinicId: string;
  templateName: string;
  jobType: JobType | null;
  subject: string | null;
  body: string | null;
  linkCtaText: string | null;
  usedFrom: string | null;
  usedTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobMedleyScoutTemplate {
  id: string;
  clinicId: string;
  templateName: string;
  jobOfferId: string | null;
  firstSentence: string | null;
  body: string | null;
  targetCriteria: string | null;
  usedFrom: string | null;
  usedTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  clinicId: string;
  source: 'guppy' | 'jobmedley';
  bannerName: string;
  imageUrl: string | null;
  copyText: string | null;
  description: string | null;
  usedFrom: string | null;
  usedTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuppyTemplateInput {
  templateName: string;
  jobType?: JobType;
  subject?: string;
  body?: string;
  linkCtaText?: string;
  usedFrom?: string;
  usedTo?: string;
  isActive?: boolean;
}

export interface CreateJobMedleyTemplateInput {
  templateName: string;
  jobOfferId?: string;
  firstSentence?: string;
  body?: string;
  targetCriteria?: string;
  usedFrom?: string;
  usedTo?: string;
  isActive?: boolean;
}

export interface CreateBannerInput {
  source: 'guppy' | 'jobmedley';
  bannerName: string;
  imageUrl?: string;
  copyText?: string;
  description?: string;
  usedFrom?: string;
  usedTo?: string;
  isActive?: boolean;
}

// ============================================
// GUPPYスカウト文面
// ============================================

/**
 * GUPPYスカウト文面一覧を取得
 */
export async function getGuppyScoutTemplates(
  supabase: SupabaseClient,
  clinicId: string,
  options?: { activeOnly?: boolean; jobType?: JobType }
): Promise<GuppyScoutTemplate[]> {
  let query = supabase
    .from('guppy_scout_templates')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }
  if (options?.jobType) {
    query = query.eq('job_type', options.jobType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching GUPPY scout templates:', error);
    return [];
  }

  return (data || []).map(mapGuppyTemplate);
}

/**
 * GUPPYスカウト文面を作成
 */
export async function createGuppyScoutTemplate(
  supabase: SupabaseClient,
  clinicId: string,
  input: CreateGuppyTemplateInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('guppy_scout_templates')
    .insert({
      clinic_id: clinicId,
      template_name: input.templateName,
      job_type: input.jobType || null,
      subject: input.subject || null,
      body: input.body || null,
      link_cta_text: input.linkCtaText || null,
      used_from: input.usedFrom || null,
      used_to: input.usedTo || null,
      is_active: input.isActive ?? true,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * GUPPYスカウト文面を更新
 */
export async function updateGuppyScoutTemplate(
  supabase: SupabaseClient,
  templateId: string,
  input: Partial<CreateGuppyTemplateInput>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {};

  if (input.templateName !== undefined) updateData.template_name = input.templateName;
  if (input.jobType !== undefined) updateData.job_type = input.jobType || null;
  if (input.subject !== undefined) updateData.subject = input.subject || null;
  if (input.body !== undefined) updateData.body = input.body || null;
  if (input.linkCtaText !== undefined) updateData.link_cta_text = input.linkCtaText || null;
  if (input.usedFrom !== undefined) updateData.used_from = input.usedFrom || null;
  if (input.usedTo !== undefined) updateData.used_to = input.usedTo || null;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { error } = await supabase
    .from('guppy_scout_templates')
    .update(updateData)
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * GUPPYスカウト文面を削除
 */
export async function deleteGuppyScoutTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('guppy_scout_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// ジョブメドレースカウト文面
// ============================================

/**
 * ジョブメドレースカウト文面一覧を取得
 */
export async function getJobMedleyScoutTemplates(
  supabase: SupabaseClient,
  clinicId: string,
  options?: { activeOnly?: boolean; jobOfferId?: string }
): Promise<JobMedleyScoutTemplate[]> {
  let query = supabase
    .from('jobmedley_scout_templates')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }
  if (options?.jobOfferId) {
    query = query.eq('job_offer_id', options.jobOfferId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching JobMedley scout templates:', error);
    return [];
  }

  return (data || []).map(mapJobMedleyTemplate);
}

/**
 * ジョブメドレースカウト文面を作成
 */
export async function createJobMedleyScoutTemplate(
  supabase: SupabaseClient,
  clinicId: string,
  input: CreateJobMedleyTemplateInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('jobmedley_scout_templates')
    .insert({
      clinic_id: clinicId,
      template_name: input.templateName,
      job_offer_id: input.jobOfferId || null,
      first_sentence: input.firstSentence || null,
      body: input.body || null,
      target_criteria: input.targetCriteria || null,
      used_from: input.usedFrom || null,
      used_to: input.usedTo || null,
      is_active: input.isActive ?? true,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * ジョブメドレースカウト文面を更新
 */
export async function updateJobMedleyScoutTemplate(
  supabase: SupabaseClient,
  templateId: string,
  input: Partial<CreateJobMedleyTemplateInput>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {};

  if (input.templateName !== undefined) updateData.template_name = input.templateName;
  if (input.jobOfferId !== undefined) updateData.job_offer_id = input.jobOfferId || null;
  if (input.firstSentence !== undefined) updateData.first_sentence = input.firstSentence || null;
  if (input.body !== undefined) updateData.body = input.body || null;
  if (input.targetCriteria !== undefined) updateData.target_criteria = input.targetCriteria || null;
  if (input.usedFrom !== undefined) updateData.used_from = input.usedFrom || null;
  if (input.usedTo !== undefined) updateData.used_to = input.usedTo || null;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { error } = await supabase
    .from('jobmedley_scout_templates')
    .update(updateData)
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * ジョブメドレースカウト文面を削除
 */
export async function deleteJobMedleyScoutTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('jobmedley_scout_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// バナー管理
// ============================================

/**
 * バナー一覧を取得
 */
export async function getBanners(
  supabase: SupabaseClient,
  clinicId: string,
  options?: { source?: 'guppy' | 'jobmedley'; activeOnly?: boolean }
): Promise<Banner[]> {
  let query = supabase
    .from('banners')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (options?.source) {
    query = query.eq('source', options.source);
  }
  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching banners:', error);
    return [];
  }

  return (data || []).map(mapBanner);
}

/**
 * バナーを作成
 */
export async function createBanner(
  supabase: SupabaseClient,
  clinicId: string,
  input: CreateBannerInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('banners')
    .insert({
      clinic_id: clinicId,
      source: input.source,
      banner_name: input.bannerName,
      image_url: input.imageUrl || null,
      copy_text: input.copyText || null,
      description: input.description || null,
      used_from: input.usedFrom || null,
      used_to: input.usedTo || null,
      is_active: input.isActive ?? true,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * バナーを更新
 */
export async function updateBanner(
  supabase: SupabaseClient,
  bannerId: string,
  input: Partial<CreateBannerInput>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {};

  if (input.source !== undefined) updateData.source = input.source;
  if (input.bannerName !== undefined) updateData.banner_name = input.bannerName;
  if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl || null;
  if (input.copyText !== undefined) updateData.copy_text = input.copyText || null;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.usedFrom !== undefined) updateData.used_from = input.usedFrom || null;
  if (input.usedTo !== undefined) updateData.used_to = input.usedTo || null;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { error } = await supabase
    .from('banners')
    .update(updateData)
    .eq('id', bannerId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * バナーを削除
 */
export async function deleteBanner(
  supabase: SupabaseClient,
  bannerId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', bannerId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// マッピング関数
// ============================================

function mapGuppyTemplate(row: Record<string, unknown>): GuppyScoutTemplate {
  return {
    id: row.id as string,
    clinicId: row.clinic_id as string,
    templateName: row.template_name as string,
    jobType: row.job_type as JobType | null,
    subject: row.subject as string | null,
    body: row.body as string | null,
    linkCtaText: row.link_cta_text as string | null,
    usedFrom: row.used_from as string | null,
    usedTo: row.used_to as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapJobMedleyTemplate(row: Record<string, unknown>): JobMedleyScoutTemplate {
  return {
    id: row.id as string,
    clinicId: row.clinic_id as string,
    templateName: row.template_name as string,
    jobOfferId: row.job_offer_id as string | null,
    firstSentence: row.first_sentence as string | null,
    body: row.body as string | null,
    targetCriteria: row.target_criteria as string | null,
    usedFrom: row.used_from as string | null,
    usedTo: row.used_to as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapBanner(row: Record<string, unknown>): Banner {
  return {
    id: row.id as string,
    clinicId: row.clinic_id as string,
    source: row.source as 'guppy' | 'jobmedley',
    bannerName: row.banner_name as string,
    imageUrl: row.image_url as string | null,
    copyText: row.copy_text as string | null,
    description: row.description as string | null,
    usedFrom: row.used_from as string | null,
    usedTo: row.used_to as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 現在アクティブな文面を取得
 */
export function getCurrentActiveTemplate<T extends { isActive: boolean; usedFrom: string | null; usedTo: string | null }>(
  templates: T[]
): T | null {
  const now = new Date().toISOString().split('T')[0];

  return templates.find((t) => {
    if (!t.isActive) return false;

    // 使用期間チェック
    if (t.usedFrom && t.usedFrom > now) return false;
    if (t.usedTo && t.usedTo < now) return false;

    return true;
  }) || null;
}

/**
 * 職種ラベルを取得
 */
export function getJobTypeLabel(jobType: string | null): string {
  if (!jobType) return '全職種';
  return JOB_TYPES.find((jt) => jt.value === jobType)?.label || jobType;
}
