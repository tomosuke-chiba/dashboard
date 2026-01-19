import { POST } from '../route';
import { getSupabaseAdmin } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: jest.fn(),
}));

const mockedGetSupabaseAdmin = getSupabaseAdmin as jest.Mock;

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/metrics/manual-input', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/metrics/manual-input', () => {
  beforeEach(() => {
    mockedGetSupabaseAdmin.mockReset();
  });

  it('should return 503 when database is not configured', async () => {
    mockedGetSupabaseAdmin.mockReturnValue(null);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'guppy',
      entries: [],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error).toBe('Database not configured');
  });

  it('should return 400 when clinic_id is missing', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      source: 'guppy',
      entries: [],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('clinic_id is required');
  });

  it('should return 400 when source is missing', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      entries: [],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('source is required');
  });

  it('should return 400 when source is invalid', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'invalid-source',
      entries: [],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid source');
  });

  it('should return 400 when entries is not an array', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'guppy',
      entries: 'not-an-array',
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('entries must be an array');
  });

  it('should return 400 when entry has invalid date format', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'guppy',
      entries: [
        { date: 'invalid-date', scout_reply_count: 10, interview_count: 3 },
      ],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid date format');
  });

  it('should return 400 when entry has future date', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'guppy',
      entries: [
        { date: futureDateStr, scout_reply_count: 10, interview_count: 3 },
      ],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Future dates are not allowed');
  });

  it('should return 400 when entry has negative scout_reply_count', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'guppy',
      entries: [
        { date: '2025-01-19', scout_reply_count: -5, interview_count: 3 },
      ],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Negative values are not allowed');
  });

  it('should return 400 when entry has non-integer interview_count', async () => {
    const mockSupabase = {
      from: jest.fn(),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'guppy',
      entries: [
        { date: '2025-01-19', scout_reply_count: 10, interview_count: 3.5 },
      ],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Non-integer values are not allowed');
  });

  it('should return 404 when clinic is not found', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };

    const mockSupabase = {
      from: jest.fn().mockReturnValue(mockQuery),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'non-existent-clinic',
      source: 'guppy',
      entries: [
        { date: '2025-01-19', scout_reply_count: 10, interview_count: 3 },
      ],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe('Clinic not found');
  });

  it('should return 200 and save data successfully', async () => {
    const mockClinicQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'clinic-1' }, error: null }),
    };

    const mockMetricsQuery = {
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'clinics') return mockClinicQuery;
        if (table === 'metrics') return mockMetricsQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'guppy',
      entries: [
        { date: '2025-01-19', scout_reply_count: 10, interview_count: 3 },
        { date: '2025-01-18', scout_reply_count: 5, interview_count: 2 },
      ],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(2);
    expect(mockMetricsQuery.upsert).toHaveBeenCalled();
  });

  it('should return 500 when upsert fails', async () => {
    const mockClinicQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'clinic-1' }, error: null }),
    };

    const mockMetricsQuery = {
      upsert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'clinics') return mockClinicQuery;
        if (table === 'metrics') return mockMetricsQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    mockedGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const request = buildRequest({
      clinic_id: 'clinic-1',
      source: 'jobmedley',
      entries: [
        { date: '2025-01-19', scout_reply_count: 10, interview_count: 3 },
      ],
    });

    const response = await POST(request as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Failed to save metrics data');
  });
});
