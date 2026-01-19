/**
 * 型定義のテスト
 * TypeScriptの型システムを使って型の正確性を検証
 */

import type { DailyMetrics, ManualInputEntry, ManualInputRequest } from '../index';

describe('DailyMetrics型定義', () => {
  it('should accept scout_reply_count as number', () => {
    const metrics: DailyMetrics = {
      id: 'test-id',
      clinic_id: 'clinic-id',
      date: '2026-01-19',
      source: 'guppy',
      job_type: 'dh',
      search_rank: 1,
      display_count: 100,
      view_count: 50,
      redirect_count: 20,
      application_count: 5,
      scout_reply_count: 10,
      interview_count: 3,
      created_at: '2026-01-19T00:00:00Z',
      updated_at: '2026-01-19T00:00:00Z',
    };

    expect(metrics.scout_reply_count).toBe(10);
    expect(typeof metrics.scout_reply_count).toBe('number');
  });

  it('should accept scout_reply_count as null', () => {
    const metrics: DailyMetrics = {
      id: 'test-id',
      clinic_id: 'clinic-id',
      date: '2026-01-19',
      source: 'guppy',
      job_type: 'dh',
      search_rank: 1,
      display_count: 100,
      view_count: 50,
      redirect_count: 20,
      application_count: 5,
      scout_reply_count: null,
      interview_count: null,
      created_at: '2026-01-19T00:00:00Z',
      updated_at: '2026-01-19T00:00:00Z',
    };

    expect(metrics.scout_reply_count).toBeNull();
    expect(metrics.interview_count).toBeNull();
  });

  it('should accept interview_count as number', () => {
    const metrics: DailyMetrics = {
      id: 'test-id',
      clinic_id: 'clinic-id',
      date: '2026-01-19',
      source: 'jobmedley',
      job_type: null,
      search_rank: null,
      display_count: 0,
      view_count: 0,
      redirect_count: 0,
      application_count: 0,
      scout_reply_count: 5,
      interview_count: 2,
      created_at: '2026-01-19T00:00:00Z',
      updated_at: '2026-01-19T00:00:00Z',
    };

    expect(metrics.interview_count).toBe(2);
    expect(typeof metrics.interview_count).toBe('number');
  });

  it('should distinguish between null and 0 for scout_reply_count', () => {
    const metricsWithNull: DailyMetrics = {
      id: 'test-1',
      clinic_id: 'clinic-id',
      date: '2026-01-19',
      source: 'guppy',
      job_type: 'dh',
      search_rank: 1,
      display_count: 100,
      view_count: 50,
      redirect_count: 20,
      application_count: 5,
      scout_reply_count: null,
      interview_count: null,
      created_at: '2026-01-19T00:00:00Z',
      updated_at: '2026-01-19T00:00:00Z',
    };

    const metricsWithZero: DailyMetrics = {
      id: 'test-2',
      clinic_id: 'clinic-id',
      date: '2026-01-19',
      source: 'guppy',
      job_type: 'dh',
      search_rank: 1,
      display_count: 100,
      view_count: 50,
      redirect_count: 20,
      application_count: 5,
      scout_reply_count: 0,
      interview_count: 0,
      created_at: '2026-01-19T00:00:00Z',
      updated_at: '2026-01-19T00:00:00Z',
    };

    expect(metricsWithNull.scout_reply_count).toBeNull();
    expect(metricsWithZero.scout_reply_count).toBe(0);
    expect(metricsWithNull.interview_count).toBeNull();
    expect(metricsWithZero.interview_count).toBe(0);
  });
});

describe('ManualInputEntry型定義', () => {
  it('should accept valid manual input entry', () => {
    const entry: ManualInputEntry = {
      date: '2026-01-19',
      scout_reply_count: 10,
      interview_count: 3,
    };

    expect(entry.date).toBe('2026-01-19');
    expect(entry.scout_reply_count).toBe(10);
    expect(entry.interview_count).toBe(3);
  });

  it('should accept zero values', () => {
    const entry: ManualInputEntry = {
      date: '2026-01-19',
      scout_reply_count: 0,
      interview_count: 0,
    };

    expect(entry.scout_reply_count).toBe(0);
    expect(entry.interview_count).toBe(0);
  });
});

describe('ManualInputRequest型定義', () => {
  it('should accept valid manual input request', () => {
    const request: ManualInputRequest = {
      clinic_id: 'clinic-uuid',
      source: 'guppy',
      entries: [
        { date: '2026-01-19', scout_reply_count: 10, interview_count: 3 },
        { date: '2026-01-20', scout_reply_count: 5, interview_count: 2 },
      ],
    };

    expect(request.clinic_id).toBe('clinic-uuid');
    expect(request.source).toBe('guppy');
    expect(request.entries).toHaveLength(2);
  });

  it('should accept all valid source types', () => {
    const guppyRequest: ManualInputRequest = {
      clinic_id: 'clinic-uuid',
      source: 'guppy',
      entries: [],
    };

    const jobmedleyRequest: ManualInputRequest = {
      clinic_id: 'clinic-uuid',
      source: 'jobmedley',
      entries: [],
    };

    const quacareerRequest: ManualInputRequest = {
      clinic_id: 'clinic-uuid',
      source: 'quacareer',
      entries: [],
    };

    expect(guppyRequest.source).toBe('guppy');
    expect(jobmedleyRequest.source).toBe('jobmedley');
    expect(quacareerRequest.source).toBe('quacareer');
  });
});
