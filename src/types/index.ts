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

// 求人データの型定義
export interface JobPosting {
  id: string;
  clinic_id: string;
  job_title: string;
  guppy_job_id: string;
  created_at: string;
}

// メトリクス（PV、応募数）の型定義
export interface Metrics {
  id: string;
  clinic_id: string;
  job_posting_id: string | null;
  pv_count: number;
  application_count: number;
  recorded_at: string;
}

// スクレイピング結果の型定義
export interface ScrapeResult {
  clinicId: string;
  clinicName: string;
  totalPV: number;
  totalApplications: number;
  jobs: {
    title: string;
    pv: number;
    applications: number;
  }[];
  scrapedAt: Date;
}

// ダッシュボード表示用の型定義
export interface DashboardData {
  clinic: {
    id: string;
    name: string;
    slug: string;
  };
  currentMetrics: {
    totalPV: number;
    totalApplications: number;
    lastUpdated: string;
  };
  history: {
    date: string;
    pv: number;
    applications: number;
  }[];
}

// Discord通知用の型定義
export interface DiscordNotification {
  clinicName: string;
  message: string;
}
