import { GET } from '../[slug]/route';
import { getSupabaseAdmin } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: jest.fn(),
}));

type Query = {
  select: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  is: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
  then: (resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) => void;
};

const createQuery = (options: { data?: unknown[]; singleData?: unknown; singleError?: unknown } = {}): Query => {
  const data = options.data ?? [];
  const query = {} as Query;

  query.select = jest.fn().mockReturnValue(query);
  query.eq = jest.fn().mockReturnValue(query);
  query.gte = jest.fn().mockReturnValue(query);
  query.lte = jest.fn().mockReturnValue(query);
  query.is = jest.fn().mockReturnValue(query);
  query.order = jest.fn().mockResolvedValue({ data });
  query.single = jest.fn().mockResolvedValue({ data: options.singleData ?? null, error: options.singleError ?? null });
  query.then = (resolve, reject) => Promise.resolve({ data }).then(resolve, reject);

  return query;
};

const buildRequest = (url: string) => ({ url });

describe('/api/clinics/[slug] source filtering', () => {
  const mockedGetSupabaseAdmin = getSupabaseAdmin as jest.Mock;

  beforeEach(() => {
    mockedGetSupabaseAdmin.mockReset();
  });

  it('applies source filters to metrics, scouts, bitly links, and available months', async () => {
    const clinic = { id: 'clinic-1', name: 'Test Clinic', slug: 'test' };
    const metricsQuery = createQuery();
    const availableMonthsQuery = createQuery();
    const metricsQueries = [metricsQuery, availableMonthsQuery];
    const scoutQuery = createQuery();
    const bitlyClicksQuery = createQuery();
    const bitlyLinksQuery = createQuery();
    const clinicsQuery = createQuery({ singleData: clinic });

    const fromMock = jest.fn((table: string) => {
      if (table === 'clinics') return clinicsQuery;
      if (table === 'metrics') return metricsQueries.shift() as Query;
      if (table === 'scout_messages') return scoutQuery;
      if (table === 'bitly_clicks') return bitlyClicksQuery;
      if (table === 'bitly_links') return bitlyLinksQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockedGetSupabaseAdmin.mockReturnValue({ from: fromMock });

    const request = buildRequest('http://localhost/api/clinics/test?source=guppy');
    const response = await GET(request, { params: Promise.resolve({ slug: 'test' }) });
    expect(response.status).toBe(200);

    const hasSourceFilter = (query: Query) =>
      query.eq.mock.calls.some(([column, value]) => column === 'source' && value === 'guppy');

    expect(hasSourceFilter(metricsQuery)).toBe(true);
    expect(hasSourceFilter(scoutQuery)).toBe(true);
    expect(hasSourceFilter(bitlyLinksQuery)).toBe(true);
    expect(hasSourceFilter(availableMonthsQuery)).toBe(true);
    expect(hasSourceFilter(bitlyClicksQuery)).toBe(false);
  });

  it('does not apply source filters when source is omitted', async () => {
    const clinic = { id: 'clinic-1', name: 'Test Clinic', slug: 'test' };
    const metricsQuery = createQuery();
    const availableMonthsQuery = createQuery();
    const metricsQueries = [metricsQuery, availableMonthsQuery];
    const scoutQuery = createQuery();
    const bitlyClicksQuery = createQuery();
    const bitlyLinksQuery = createQuery();
    const clinicsQuery = createQuery({ singleData: clinic });

    const fromMock = jest.fn((table: string) => {
      if (table === 'clinics') return clinicsQuery;
      if (table === 'metrics') return metricsQueries.shift() as Query;
      if (table === 'scout_messages') return scoutQuery;
      if (table === 'bitly_clicks') return bitlyClicksQuery;
      if (table === 'bitly_links') return bitlyLinksQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockedGetSupabaseAdmin.mockReturnValue({ from: fromMock });

    const request = buildRequest('http://localhost/api/clinics/test');
    const response = await GET(request, { params: Promise.resolve({ slug: 'test' }) });
    expect(response.status).toBe(200);

    const hasSourceFilter = (query: Query) =>
      query.eq.mock.calls.some(([column]) => column === 'source');

    expect(hasSourceFilter(metricsQuery)).toBe(false);
    expect(hasSourceFilter(scoutQuery)).toBe(false);
    expect(hasSourceFilter(bitlyLinksQuery)).toBe(false);
    expect(hasSourceFilter(bitlyClicksQuery)).toBe(false);
    expect(hasSourceFilter(availableMonthsQuery)).toBe(false);
  });

  it('returns 400 for invalid source parameter', async () => {
    const request = buildRequest('http://localhost/api/clinics/test?source=invalid');
    const response = await GET(request, { params: Promise.resolve({ slug: 'test' }) });
    expect(response.status).toBe(400);
    expect(mockedGetSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('returns 503 when database is not configured', async () => {
    mockedGetSupabaseAdmin.mockReturnValue(null);
    const request = buildRequest('http://localhost/api/clinics/test?source=guppy');
    const response = await GET(request, { params: Promise.resolve({ slug: 'test' }) });
    expect(response.status).toBe(503);
  });

  it('returns 404 when clinic is not found', async () => {
    const clinicsQuery = createQuery({ singleData: null, singleError: { message: 'not found' } });
    const fromMock = jest.fn((table: string) => {
      if (table === 'clinics') return clinicsQuery;
      if (table === 'metrics') return createQuery();
      if (table === 'scout_messages') return createQuery();
      if (table === 'bitly_clicks') return createQuery();
      if (table === 'bitly_links') return createQuery();
      throw new Error(`Unexpected table: ${table}`);
    });

    mockedGetSupabaseAdmin.mockReturnValue({ from: fromMock });

    const request = buildRequest('http://localhost/api/clinics/test?source=guppy');
    const response = await GET(request, { params: Promise.resolve({ slug: 'test' }) });
    expect(response.status).toBe(404);
  });
});
