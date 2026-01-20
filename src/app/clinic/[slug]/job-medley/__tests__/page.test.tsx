import { render, screen, waitFor } from '@testing-library/react';
import JobMedleyPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ slug: 'test-clinic' })),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    toggleTheme: jest.fn(),
    mounted: true,
  })),
  ThemeToggle: () => <div>ThemeToggle</div>,
}));

jest.mock('@/components/ManualMetricsInput', () => {
  return function MockManualMetricsInput(props: any) {
    return (
      <div data-testid="manual-metrics-input">
        <span>ManualMetricsInput</span>
        <span data-testid="clinic-id">{props.clinicId}</span>
        <span data-testid="source">{props.source}</span>
        <span data-testid="is-dark">{props.isDark ? 'dark' : 'light'}</span>
      </div>
    );
  };
});

jest.mock('@/components/ProfileCard', () => ({
  JobMedleyIndicatorCard: () => <div>JobMedleyIndicatorCard</div>,
}));

// Mock API responses
const mockClinicResponse = {
  clinic: {
    id: 'clinic-uuid-456',
    name: 'テストクリニック',
    slug: 'test-clinic',
  },
};

const mockJobmedleyResponse = {
  analysis: {
    period: '2025-01',
    hireCount: 2,
    applicationCount: 10,
    scoutApplicationCount: 5,
    pageViewCount: 100,
  },
  scout: {
    totalSentCount: 50,
    dailyData: [],
  },
  rank: null,
  scrapedAt: '2025-01-15T10:00:00Z',
};

global.fetch = jest.fn((url: string) => {
  if (url.includes('/api/clinics/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockClinicResponse),
    });
  }
  if (url.includes('/api/jobmedley')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockJobmedleyResponse),
    });
  }
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: 'Not found' }),
  });
}) as jest.Mock;

describe('JobMedleyPage - ManualMetricsInput Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ManualMetricsInput component', async () => {
    render(<JobMedleyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('manual-metrics-input')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should pass correct clinicId prop to ManualMetricsInput', async () => {
    render(<JobMedleyPage />);

    await waitFor(() => {
      const clinicIdElement = screen.getByTestId('clinic-id');
      expect(clinicIdElement.textContent).toBe('clinic-uuid-456');
    }, { timeout: 3000 });
  });

  it('should pass source="jobmedley" to ManualMetricsInput', async () => {
    render(<JobMedleyPage />);

    await waitFor(() => {
      const sourceElement = screen.getByTestId('source');
      expect(sourceElement.textContent).toBe('jobmedley');
    }, { timeout: 3000 });
  });

  it('should pass isDark theme to ManualMetricsInput', async () => {
    render(<JobMedleyPage />);

    await waitFor(() => {
      const isDarkElement = screen.getByTestId('is-dark');
      expect(isDarkElement.textContent).toBe('light');
    }, { timeout: 3000 });
  });

  it('should pass isDark=true when theme is dark', async () => {
    const { useTheme } = require('@/hooks/useTheme');
    useTheme.mockReturnValue({
      isDark: true,
      toggleTheme: jest.fn(),
      mounted: true,
    });

    render(<JobMedleyPage />);

    await waitFor(() => {
      const isDarkElement = screen.getByTestId('is-dark');
      expect(isDarkElement.textContent).toBe('dark');
    }, { timeout: 3000 });
  });
});
