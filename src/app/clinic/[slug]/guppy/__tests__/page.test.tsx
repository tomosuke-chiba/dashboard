import { render, screen, waitFor } from '@testing-library/react';
import GuppyPage from '../page';

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

// Mock API response
const mockApiResponse = {
  clinic: {
    id: 'clinic-uuid-123',
    name: 'テストクリニック',
    slug: 'test-clinic',
  },
  metrics: [],
  summary: {
    totalDisplayCount: 100,
    totalViewCount: 50,
    totalRedirectCount: 10,
    totalApplicationCount: 5,
    viewRate: 50,
    applicationRate: 10,
  },
  availableMonths: ['2025-01'],
  currentMonth: '2025-01',
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockApiResponse),
  })
) as jest.Mock;

describe('GuppyPage - ManualMetricsInput Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ManualMetricsInput component', async () => {
    render(<GuppyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('manual-metrics-input')).toBeInTheDocument();
    });
  });

  it('should pass correct clinicId prop to ManualMetricsInput', async () => {
    render(<GuppyPage />);

    await waitFor(() => {
      const clinicIdElement = screen.getByTestId('clinic-id');
      expect(clinicIdElement.textContent).toBe('clinic-uuid-123');
    });
  });

  it('should pass source="guppy" to ManualMetricsInput', async () => {
    render(<GuppyPage />);

    await waitFor(() => {
      const sourceElement = screen.getByTestId('source');
      expect(sourceElement.textContent).toBe('guppy');
    });
  });

  it('should pass isDark theme to ManualMetricsInput', async () => {
    render(<GuppyPage />);

    await waitFor(() => {
      const isDarkElement = screen.getByTestId('is-dark');
      expect(isDarkElement.textContent).toBe('light');
    });
  });

  it('should pass isDark=true when theme is dark', async () => {
    const { useTheme } = require('@/hooks/useTheme');
    useTheme.mockReturnValue({
      isDark: true,
      toggleTheme: jest.fn(),
      mounted: true,
    });

    render(<GuppyPage />);

    await waitFor(() => {
      const isDarkElement = screen.getByTestId('is-dark');
      expect(isDarkElement.textContent).toBe('dark');
    });
  });
});
