import { render, screen, waitFor } from '@testing-library/react';
import ClinicListPage from '../page';

// Mock dependencies
jest.mock('@/hooks/useTheme', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    toggleTheme: jest.fn(),
    mounted: true,
  })),
  ThemeToggle: () => <div>ThemeToggle</div>,
}));

// Mock API response
const mockApiResponse = {
  clinics: [
    {
      id: 'clinic-1',
      name: 'テストクリニック1',
      slug: 'test-clinic-1',
      createdAt: '2024-01-01',
      metrics: {
        totalApplicationCount: 10,
        totalViewCount: 100,
        totalDisplayCount: 200,
        totalRedirectCount: 50,
        totalScoutSentCount: 30,
        totalScoutReplyCount: 5,
        totalInterviewCount: 3,
        totalHireCount: 1,
        missingManualMetrics: false,
        searchRanks: {
          guppy: 5,
          jobmedley: 10,
          quacareer: 3,
        },
      },
      goalProgress: null,
      hasPassword: true,
      latestDataDate: '2024-01-15',
    },
    {
      id: 'clinic-2',
      name: 'テストクリニック2',
      slug: 'test-clinic-2',
      createdAt: '2024-01-01',
      metrics: {
        totalApplicationCount: 0,
        totalViewCount: 0,
        totalDisplayCount: 0,
        totalRedirectCount: 0,
        totalScoutSentCount: 0,
        totalScoutReplyCount: null,
        totalInterviewCount: null,
        totalHireCount: 0,
        missingManualMetrics: true,
        searchRanks: {
          guppy: null,
          jobmedley: null,
          quacareer: null,
        },
      },
      goalProgress: null,
      hasPassword: false,
      latestDataDate: null,
    },
  ],
  total: 2,
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockApiResponse),
  })
) as jest.Mock;

describe('ClinicListPage - KPI表示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('検索順位の媒体別表示', () => {
    it('検索順位が存在する場合、G:/J:/Q: の形式で位表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック1')).toBeInTheDocument();
      });

      // G:5位 J:10位 Q:3位 の形式で表示されることを確認
      const searchRankElement = screen.getByText(/G:5位 J:10位 Q:3位/);
      expect(searchRankElement).toBeInTheDocument();
    });

    it('検索順位がnullの場合、"-"で表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック2')).toBeInTheDocument();
      });

      // G:- J:- Q:- の形式で表示されることを確認
      const searchRankElement = screen.getByText(/G:- J:- Q:-/);
      expect(searchRankElement).toBeInTheDocument();
    });
  });

  describe('通常KPIの表示', () => {
    it('PVが0の場合、"0件"と表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック2')).toBeInTheDocument();
      });

      const card = screen.getByText('テストクリニック2').closest('div')?.parentElement;
      expect(card).toHaveTextContent('PV');
      expect(card).toHaveTextContent('0件');
    });

    it('応募数が正の値の場合、単位付きで表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック1')).toBeInTheDocument();
      });

      const card = screen.getByText('テストクリニック1').closest('div')?.parentElement;
      expect(card).toHaveTextContent('応募数');
      expect(card).toHaveTextContent('10件');
    });

    it('スカウト送信数が正の値の場合、"通"単位で表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック1')).toBeInTheDocument();
      });

      const card = screen.getByText('テストクリニック1').closest('div')?.parentElement;
      expect(card).toHaveTextContent('スカウト送信数');
      expect(card).toHaveTextContent('30通');
    });

    it('採用決定数が正の値の場合、"人"単位で表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック1')).toBeInTheDocument();
      });

      const card = screen.getByText('テストクリニック1').closest('div')?.parentElement;
      expect(card).toHaveTextContent('採用決定数');
      expect(card).toHaveTextContent('1人');
    });
  });

  describe('手動入力KPIの表示（未入力/欠損/0の区別）', () => {
    it('missingManualMetrics=trueの場合、"未入力"と表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック2')).toBeInTheDocument();
      });

      const card = screen.getByText('テストクリニック2').closest('div')?.parentElement;
      expect(card).toHaveTextContent('スカウト返信数');
      expect(card).toHaveTextContent('未入力');
      expect(card).toHaveTextContent('面接設定数');
    });

    it('missingManualMetrics=falseで値が存在する場合、単位付きで表示する', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック1')).toBeInTheDocument();
      });

      const card = screen.getByText('テストクリニック1').closest('div')?.parentElement;
      expect(card).toHaveTextContent('スカウト返信数');
      expect(card).toHaveTextContent('5通');
      expect(card).toHaveTextContent('面接設定数');
      expect(card).toHaveTextContent('3件');
    });
  });

  describe('月選択フィルター', () => {
    it('月選択inputが表示される', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        const monthInput = screen.getByDisplayValue(/\d{4}-\d{2}/);
        expect(monthInput).toBeInTheDocument();
      });
    });
  });

  describe('検索フィルター', () => {
    it('検索inputが表示される', async () => {
      render(<ClinicListPage />);

      const searchInput = screen.getByPlaceholderText('クリニック名で検索...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('リンク表示', () => {
    it('GUPPY/ジョブメドレー/クオキャリアのリンクが表示される', async () => {
      render(<ClinicListPage />);

      await waitFor(() => {
        expect(screen.getByText('テストクリニック1')).toBeInTheDocument();
      });

      expect(screen.getAllByText('GUPPY').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ジョブメドレー').length).toBeGreaterThan(0);
      expect(screen.getAllByText('クオキャリア').length).toBeGreaterThan(0);
    });
  });
});

describe('ClinicListPage - formatヘルパー関数の動作確認', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formatRank: nullの場合"-"、数値の場合"数値位"を返す', async () => {
    const mockResponse = {
      clinics: [
        {
          id: 'clinic-test',
          name: 'formatRankテスト',
          slug: 'format-rank-test',
          createdAt: '2024-01-01',
          metrics: {
            totalApplicationCount: 0,
            totalViewCount: 0,
            totalDisplayCount: 0,
            totalRedirectCount: 0,
            totalScoutSentCount: 0,
            totalScoutReplyCount: null,
            totalInterviewCount: null,
            totalHireCount: 0,
            missingManualMetrics: true,
            searchRanks: {
              guppy: 1,
              jobmedley: null,
              quacareer: 99,
            },
          },
          goalProgress: null,
          hasPassword: false,
          latestDataDate: null,
        },
      ],
      total: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<ClinicListPage />);

    await waitFor(() => {
      expect(screen.getByText('formatRankテスト')).toBeInTheDocument();
    });

    const card = screen.getByText('formatRankテスト').closest('div')?.parentElement;
    expect(card).toHaveTextContent('G:1位');
    expect(card).toHaveTextContent('J:-');
    expect(card).toHaveTextContent('Q:99位');
  });

  it('formatWithUnit: nullの場合"-"、数値の場合"数値+単位"を返す', async () => {
    const mockResponse = {
      clinics: [
        {
          id: 'clinic-test',
          name: 'formatWithUnitテスト',
          slug: 'format-with-unit-test',
          createdAt: '2024-01-01',
          metrics: {
            totalApplicationCount: 0,
            totalViewCount: 50,
            totalDisplayCount: 0,
            totalRedirectCount: 0,
            totalScoutSentCount: 0,
            totalScoutReplyCount: null,
            totalInterviewCount: null,
            totalHireCount: 0,
            missingManualMetrics: true,
            searchRanks: {
              guppy: null,
              jobmedley: null,
              quacareer: null,
            },
          },
          goalProgress: null,
          hasPassword: false,
          latestDataDate: null,
        },
      ],
      total: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<ClinicListPage />);

    await waitFor(() => {
      expect(screen.getByText('formatWithUnitテスト')).toBeInTheDocument();
    });

    const card = screen.getByText('formatWithUnitテスト').closest('div')?.parentElement;
    expect(card).toHaveTextContent('PV');
    expect(card).toHaveTextContent('50件');
    expect(card).toHaveTextContent('応募数');
    expect(card).toHaveTextContent('0件');
  });
});
