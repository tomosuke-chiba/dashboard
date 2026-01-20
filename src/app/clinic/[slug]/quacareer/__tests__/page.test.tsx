import { render, screen, waitFor } from '@testing-library/react';
import QuacareerPage from '../page';

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

jest.mock('@/components/KPICard', () => ({
  KPISummary: () => <div>KPISummary</div>,
  AlertList: () => <div>AlertList</div>,
  SolutionTable: () => <div>SolutionTable</div>,
}));

// Mock API responses
const mockClinicResponse = {
  clinic: {
    id: 'clinic-uuid-789',
    name: 'テストクリニック',
    slug: 'test-clinic',
  },
};

const mockQuacareerResponse = {
  dashboard: {
    totalApplicants: 30,
    favoritesDH: 10,
    favoritesDR: 5,
    scoutMailOpenRate: 75.5,
    scoutPlusOpenRate: 80.2,
  },
  scoutMails: [],
  scrapedAt: '2025-01-15T10:00:00Z',
};

global.fetch = jest.fn((url: string) => {
  if (url.includes('/api/clinics/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockClinicResponse),
    });
  }
  if (url.includes('/api/quacareer')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockQuacareerResponse),
    });
  }
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: 'Not found' }),
  });
}) as jest.Mock;

describe('QuacareerPage - ManualMetricsInput Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ManualMetricsInput component', async () => {
    render(<QuacareerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('manual-metrics-input')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should pass correct clinicId prop to ManualMetricsInput', async () => {
    render(<QuacareerPage />);

    await waitFor(() => {
      const clinicIdElement = screen.getByTestId('clinic-id');
      expect(clinicIdElement.textContent).toBe('clinic-uuid-789');
    }, { timeout: 3000 });
  });

  it('should pass source="quacareer" to ManualMetricsInput', async () => {
    render(<QuacareerPage />);

    await waitFor(() => {
      const sourceElement = screen.getByTestId('source');
      expect(sourceElement.textContent).toBe('quacareer');
    }, { timeout: 3000 });
  });

  it('should pass isDark theme to ManualMetricsInput', async () => {
    render(<QuacareerPage />);

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

    render(<QuacareerPage />);

    await waitFor(() => {
      const isDarkElement = screen.getByTestId('is-dark');
      expect(isDarkElement.textContent).toBe('dark');
    }, { timeout: 3000 });
  });
});
