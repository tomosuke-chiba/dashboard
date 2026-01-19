import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManualMetricsInput from '../ManualMetricsInput';

// fetch をモック
global.fetch = jest.fn();

describe('ManualMetricsInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render calendar grid for the current month', () => {
    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    // カレンダーグリッドが表示されることを確認
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should display labels for scout_reply_count and interview_count', () => {
    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    // ラベルが表示されることを確認（複数存在するためgetAllByText使用）
    const scoutLabels = screen.getAllByText(/スカウト返信数/i);
    expect(scoutLabels.length).toBeGreaterThan(0);

    const interviewLabels = screen.getAllByText(/面接設定数/i);
    expect(interviewLabels.length).toBeGreaterThan(0);
  });

  it('should accept numeric input for scout_reply_count', () => {
    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    const firstInput = inputs[0];

    fireEvent.change(firstInput, { target: { value: '10' } });
    expect(firstInput).toHaveValue(10);
  });

  it('should not accept negative values', () => {
    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    const firstInput = inputs[0];

    // min="0"属性があることを確認
    expect(firstInput).toHaveAttribute('min', '0');
  });

  it('should display save button', () => {
    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should call API on save button click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, count: 2 }),
    });

    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });
    fireEvent.change(inputs[1], { target: { value: '3' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metrics/manual-input',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('should display success message on successful save', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, count: 2 }),
    });

    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    // 入力データを設定
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/保存しました/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display error message on save failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to save' }),
    });

    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    // 入力データを設定
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to save/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show loading state during save', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({ success: true }) }), 100))
    );

    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    // 入力データを設定
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);

    // ローディング状態を確認
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /保存中/i })).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should display input total', () => {
    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
      />
    );

    // 入力合計が表示されることを確認（複数存在するためgetAllByText使用）
    const totalLabels = screen.getAllByText(/入力合計/i);
    expect(totalLabels.length).toBeGreaterThan(0);
  });

  it('should allow month/year navigation', () => {
    render(
      <ManualMetricsInput
        clinicId="clinic-1"
        source="guppy"
        isDark={false}
        initialYear={2025}
        initialMonth={1}
      />
    );

    // 年月選択UIが表示されることを確認
    expect(screen.getByText(/2025年1月/i)).toBeInTheDocument();
  });
});
