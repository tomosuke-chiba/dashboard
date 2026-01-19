// 職種の型定義
export type JobType = 'dr' | 'dh' | 'da' | 'reception' | 'technician' | 'dietitian' | 'nursery' | 'kindergarten' | 'medical_clerk';

// 媒体の型定義
export type Source = 'guppy' | 'jobmedley' | 'quacareer';

// クライアント（歯科医院）の型定義
export interface Clinic {
  id: string;
  name: string;
  slug: string;
  guppy_login_id: string | null;
  guppy_password: string | null;
  guppy_clinic_name: string | null;
  guppy_search_url: string | null;
  jobmedley_login_id: string | null;
  jobmedley_password: string | null;
  jobmedley_clinic_name: string | null;
  jobmedley_search_url: string | null;
  quacareer_login_id: string | null;
  quacareer_password: string | null;
  bitly_url: string | null;
  created_at: string;
  updated_at: string;
}

// 日別アクセスログの型定義
export interface DailyMetrics {
  id: string;
  clinic_id: string;
  date: string;
  source: Source;
  job_type: JobType | null;
  search_rank: number | null;
  display_count: number;
  view_count: number;
  redirect_count: number;
  application_count: number;
  scout_reply_count: number | null;
  interview_count: number | null;
  created_at: string;
  updated_at: string;
}

// スカウトメールデータの型定義
export interface ScoutMessage {
  id: string;
  clinic_id: string;
  date: string;
  source: Source;
  sent_count: number;
  reply_count: number;
  open_count: number;
  created_at: string;
  updated_at: string;
}

// Bitlyクリックデータの型定義
export interface BitlyClick {
  id: string;
  clinic_id: string;
  date: string;
  click_count: number;
  created_at: string;
  updated_at: string;
}

// スクレイピング結果の型定義（日別データ）
export interface AccessLogEntry {
  date: string;
  displayCount: number;
  viewCount: number;
  redirectCount: number;
  applicationCount: number;
}

// 職種別スクレイピング結果
export interface JobTypeAccessLog {
  jobType: JobType;
  accessLogs: AccessLogEntry[];
}

export interface ScrapeResult {
  clinicId: string;
  clinicName: string;
  accessLogs: AccessLogEntry[];
  jobTypeAccessLogs?: JobTypeAccessLog[];
  scrapedAt: Date;
}

// スカウトメールスクレイピング結果
export interface ScoutScrapeResult {
  clinicId: string;
  clinicName: string;
  date: string;
  sentCount: number;
  replyCount: number;
  scrapedAt: Date;
}

// ダッシュボード表示用の型定義
export interface DashboardData {
  clinic: {
    id: string;
    name: string;
    slug: string;
  };
  metrics: DailyMetrics[];
  summary: {
    totalDisplayCount: number;
    totalViewCount: number;
    totalRedirectCount: number;
    totalApplicationCount: number;
    viewRate: number;
    applicationRate: number;
  };
  scoutMessages?: ScoutMessage[];
  bitlyClicks?: BitlyClick[];
}

// 職種別サマリー
export interface JobTypeSummary {
  jobType: JobType | 'all';
  totalDisplayCount: number;
  totalViewCount: number;
  totalRedirectCount: number;
  totalApplicationCount: number;
  viewRate: number;
  applicationRate: number;
}

// Discord通知用の型定義
export interface DiscordNotification {
  clinicName: string;
  message: string;
  type?: 'application' | 'alert';
}

// 閲覧率アラートの型定義
export interface ViewRateAlert {
  clinicId: string;
  clinicName: string;
  date: string;
  viewRate: number;
  displayCount: number;
  viewCount: number;
}

// 職種のラベル定義
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  dr: '歯科医師',
  dh: '歯科衛生士',
  da: '歯科助手',
  reception: '受付',
  technician: '歯科技工士',
  dietitian: '管理栄養士',
  nursery: '保育士',
  kindergarten: '幼稚園教諭',
  medical_clerk: '医療事務',
};

// Phase 1対応職種
export const PHASE1_JOB_TYPES: JobType[] = ['dr', 'dh', 'da'];

// 手動入力メトリクスの型定義
export interface ManualInputEntry {
  date: string; // YYYY-MM-DD
  scout_reply_count: number; // 0以上の整数
  interview_count: number; // 0以上の整数
}

export interface ManualInputRequest {
  clinic_id: string; // UUID
  source: Source;
  entries: ManualInputEntry[];
}

export interface ManualMetricsInputProps {
  clinicId: string;
  source: Source;
  isDark: boolean;
  initialYear?: number;
  initialMonth?: number;
}
