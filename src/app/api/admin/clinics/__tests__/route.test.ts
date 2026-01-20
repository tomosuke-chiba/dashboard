import { GET } from '../route';
import { getSupabaseAdmin } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: jest.fn(),
}));

type Query = {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  ilike: jest.Mock;
  order: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  then: (resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) => void;
};

const createQuery = (options: {
  data?: unknown[];
  singleData?: unknown;
  singleError?: unknown;
  maybeSingleData?: unknown;
} = {}): Query => {
  const data = options.data ?? [];
  const query = {} as Query;

  query.select = jest.fn().mockReturnValue(query);
  query.eq = jest.fn().mockReturnValue(query);
  query.in = jest.fn().mockReturnValue(query);
  query.gte = jest.fn().mockReturnValue(query);
  query.lte = jest.fn().mockReturnValue(query);
  query.ilike = jest.fn().mockReturnValue(query);
  query.order = jest.fn().mockResolvedValue({ data });
  query.single = jest.fn().mockResolvedValue({
    data: options.singleData ?? null,
    error: options.singleError ?? null
  });
  query.maybeSingle = jest.fn().mockResolvedValue({
    data: options.maybeSingleData ?? null,
    error: null
  });
  query.then = (resolve, reject) => Promise.resolve({ data }).then(resolve, reject);

  return query;
};

const buildRequest = (url: string) =>
  new Request(url) as unknown as import('next/server').NextRequest;

describe('/api/admin/clinics', () => {
  const mockedGetSupabaseAdmin = getSupabaseAdmin as jest.Mock;

  beforeEach(() => {
    mockedGetSupabaseAdmin.mockReset();
  });

  describe('検索順位の媒体別取得', () => {
    it('GUPPYの最新日付の検索順位を取得する', async () => {
      const clinic = {
        id: 'clinic-1',
        name: 'Test Clinic',
        slug: 'test',
        created_at: '2024-01-01'
      };

      const guppyMetrics = [
        { date: '2024-01-05', search_rank: 10 },
        { date: '2024-01-10', search_rank: 5 },
        { date: '2024-01-08', search_rank: 7 },
      ];

      const clinicsQuery = createQuery({ data: [clinic] });
      const guppyQuery = createQuery({ data: guppyMetrics });
      const emptyQuery = createQuery({ data: [] });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 2) return guppyQuery; // guppy metrics
          if (queryCallIndex === 3) return emptyQuery; // jobmedley_scouts
          if (queryCallIndex === 4) return emptyQuery; // quacareer metrics
          if (queryCallIndex === 5) return emptyQuery; // scout_messages
          if (queryCallIndex === 6) return emptyQuery; // manual metrics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 8) return emptyQuery; // recruitment_goals
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?month=2024-01');
      const response = await GET(request);
      const json = await response.json();

      expect(json.clinics).toHaveLength(1);
      expect(json.clinics[0].metrics.searchRanks.guppy).toBe(5); // 最新日付(2024-01-10)の検索順位
    });

    it('JobMedleyの最新日付の検索順位を取得する', async () => {
      const clinic = {
        id: 'clinic-1',
        name: 'Test Clinic',
        slug: 'test',
        created_at: '2024-01-01'
      };

      const jobmedleyDaily = [
        { date: '2024-01-05', search_rank: 20, page_view_count: 0, application_count_total: 0, sent_count: 0 },
        { date: '2024-01-12', search_rank: 15, page_view_count: 0, application_count_total: 0, sent_count: 0 },
        { date: '2024-01-09', search_rank: 18, page_view_count: 0, application_count_total: 0, sent_count: 0 },
      ];

      const clinicsQuery = createQuery({ data: [clinic] });
      const emptyQuery = createQuery({ data: [] });
      const jobmedleyQuery = createQuery({ data: jobmedleyDaily });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 2) return emptyQuery; // guppy metrics
          if (queryCallIndex === 3) return jobmedleyQuery; // jobmedley_scouts
          if (queryCallIndex === 4) return emptyQuery; // quacareer metrics
          if (queryCallIndex === 5) return emptyQuery; // scout_messages
          if (queryCallIndex === 6) return emptyQuery; // manual metrics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 8) return emptyQuery; // recruitment_goals
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?month=2024-01');
      const response = await GET(request);
      const json = await response.json();

      expect(json.clinics).toHaveLength(1);
      expect(json.clinics[0].metrics.searchRanks.jobmedley).toBe(15); // 最新日付(2024-01-12)の検索順位
    });

    it('検索順位データが存在しない場合はnullを返す', async () => {
      const clinic = {
        id: 'clinic-1',
        name: 'Test Clinic',
        slug: 'test',
        created_at: '2024-01-01'
      };

      const clinicsQuery = createQuery({ data: [clinic] });
      const emptyQuery = createQuery({ data: [] });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?month=2024-01');
      const response = await GET(request);
      const json = await response.json();

      expect(json.clinics).toHaveLength(1);
      expect(json.clinics[0].metrics.searchRanks.guppy).toBeNull();
      expect(json.clinics[0].metrics.searchRanks.jobmedley).toBeNull();
      expect(json.clinics[0].metrics.searchRanks.quacareer).toBeNull();
    });

    it('検索順位がnullの場合でもnullを返す', async () => {
      const clinic = {
        id: 'clinic-1',
        name: 'Test Clinic',
        slug: 'test',
        created_at: '2024-01-01'
      };

      const guppyMetrics = [
        { date: '2024-01-10', search_rank: null },
      ];

      const clinicsQuery = createQuery({ data: [clinic] });
      const guppyQuery = createQuery({ data: guppyMetrics });
      const emptyQuery = createQuery({ data: [] });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 2) return guppyQuery; // guppy metrics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?month=2024-01');
      const response = await GET(request);
      const json = await response.json();

      expect(json.clinics).toHaveLength(1);
      expect(json.clinics[0].metrics.searchRanks.guppy).toBeNull();
    });
  });

  describe('手動入力KPIの未入力判定', () => {
    it('すべてのメトリクスがNULLの場合、missingManualMetricsがtrueになる', async () => {
      const clinic = {
        id: 'clinic-1',
        name: 'Test Clinic',
        slug: 'test',
        created_at: '2024-01-01'
      };

      const manualMetrics = [
        { date: '2024-01-05', scout_reply_count: null, interview_count: null },
        { date: '2024-01-10', scout_reply_count: null, interview_count: null },
      ];

      const clinicsQuery = createQuery({ data: [clinic] });
      const manualQuery = createQuery({ data: manualMetrics });
      const emptyQuery = createQuery({ data: [] });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 6) return manualQuery; // manual metrics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?month=2024-01');
      const response = await GET(request);
      const json = await response.json();

      expect(json.clinics).toHaveLength(1);
      expect(json.clinics[0].metrics.missingManualMetrics).toBe(true);
      expect(json.clinics[0].metrics.totalScoutReplyCount).toBeNull();
      expect(json.clinics[0].metrics.totalInterviewCount).toBeNull();
    });

    it('一部のメトリクスに値がある場合、missingManualMetricsがfalseになる', async () => {
      const clinic = {
        id: 'clinic-1',
        name: 'Test Clinic',
        slug: 'test',
        created_at: '2024-01-01'
      };

      const manualMetrics = [
        { date: '2024-01-05', scout_reply_count: null, interview_count: null },
        { date: '2024-01-10', scout_reply_count: 5, interview_count: null },
        { date: '2024-01-15', scout_reply_count: null, interview_count: 3 },
      ];

      const clinicsQuery = createQuery({ data: [clinic] });
      const manualQuery = createQuery({ data: manualMetrics });
      const emptyQuery = createQuery({ data: [] });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 6) return manualQuery; // manual metrics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?month=2024-01');
      const response = await GET(request);
      const json = await response.json();

      expect(json.clinics).toHaveLength(1);
      expect(json.clinics[0].metrics.missingManualMetrics).toBe(false);
      expect(json.clinics[0].metrics.totalScoutReplyCount).toBe(5);
      expect(json.clinics[0].metrics.totalInterviewCount).toBe(3);
    });

    it('メトリクスデータが空の場合、missingManualMetricsがtrueになる', async () => {
      const clinic = {
        id: 'clinic-1',
        name: 'Test Clinic',
        slug: 'test',
        created_at: '2024-01-01'
      };

      const clinicsQuery = createQuery({ data: [clinic] });
      const emptyQuery = createQuery({ data: [] });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?month=2024-01');
      const response = await GET(request);
      const json = await response.json();

      expect(json.clinics).toHaveLength(1);
      expect(json.clinics[0].metrics.missingManualMetrics).toBe(true);
      expect(json.clinics[0].metrics.totalScoutReplyCount).toBeNull();
      expect(json.clinics[0].metrics.totalInterviewCount).toBeNull();
    });
  });

  describe('基本動作', () => {
    it('Supabaseが設定されていない場合、503エラーを返す', async () => {
      mockedGetSupabaseAdmin.mockReturnValue(null);

      const request = buildRequest('http://localhost:3000/api/admin/clinics');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.error).toBe('Database not configured');
    });

    it('検索パラメータが機能する', async () => {
      const clinics = [
        { id: 'clinic-1', name: 'Test Clinic', slug: 'test', created_at: '2024-01-01' },
      ];

      const clinicsQuery = createQuery({ data: clinics });
      const emptyQuery = createQuery({ data: [] });
      const nullMaybeSingleQuery = createQuery({ maybeSingleData: null });

      let queryCallIndex = 0;
      mockedGetSupabaseAdmin.mockReturnValue({
        from: (table: string) => {
          queryCallIndex++;
          if (queryCallIndex === 1) return clinicsQuery; // clinics
          if (queryCallIndex === 7) return nullMaybeSingleQuery; // jobmedley_analysis
          if (queryCallIndex === 9) return createQuery({ singleData: null }); // clinic_auth
          return emptyQuery;
        },
      });

      const request = buildRequest('http://localhost:3000/api/admin/clinics?search=Test');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.clinics).toHaveLength(1);
      expect(clinicsQuery.ilike).toHaveBeenCalledWith('name', '%Test%');
    });
  });
});
