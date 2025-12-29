// クライアント（歯科医院）の型定義
export interface Clinic {
  id: string;
  name: string;
  slug: string;
  guppy_login_id: string;
  guppy_password: string;
  created_at: string;
  updated_at: string;
}

// 日別アクセスログの型定義
export interface DailyMetrics {
  id: string;
  clinic_id: string;
  date: string;
  display_count: number;
  view_count: number;
  redirect_count: number;
  application_count: number;
  created_at: string;
}

// スクレイピング結果の型定義（日別データ）
export interface AccessLogEntry {
  date: string;
  displayCount: number;
  viewCount: number;
  redirectCount: number;
  applicationCount: number;
}

export interface ScrapeResult {
  clinicId: string;
  clinicName: string;
  accessLogs: AccessLogEntry[];
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
  };
}

// Discord通知用の型定義
export interface DiscordNotification {
  clinicName: string;
  message: string;
}
