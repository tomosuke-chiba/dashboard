'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme, ThemeToggle } from '@/hooks/useTheme';

interface PasswordStatus {
  id: string;
  name: string;
  slug: string;
  hasPassword: boolean;
  passwordUpdatedAt: string | null;
}

export default function PasswordsPage() {
  const { isDark, toggleTheme, mounted } = useTheme();

  const [clinics, setClinics] = useState<PasswordStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // フォーム状態
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 認証チェック（一時的に無効化）
  useEffect(() => {
    // 認証無効化中は常に管理者として扱う
    setIsAdmin(true);
  }, []);

  // データ取得
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/passwords');
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
      }
    } catch (error) {
      console.error('Failed to fetch password status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  // パスワード設定
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // バリデーション
    if (!selectedClinicId) {
      setFormError('クリニックを選択してください');
      return;
    }

    if (password.length < 8) {
      setFormError('パスワードは8文字以上で入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('パスワードが一致しません');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: selectedClinicId, password }),
      });

      if (res.ok) {
        setFormSuccess('パスワードを設定しました');
        setPassword('');
        setConfirmPassword('');
        setSelectedClinicId('');
        fetchData(); // リスト更新
      } else {
        const data = await res.json();
        setFormError(data.error || 'パスワードの設定に失敗しました');
      }
    } catch {
      setFormError('ネットワークエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (!mounted || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* ヘッダー */}
      <header
        className={`border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      >
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className={`text-sm ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ← 管理画面に戻る
            </Link>
            <h1
              className={`text-xl font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
            >
              パスワード管理
            </h1>
          </div>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* パスワード設定フォーム */}
        <div
          className={`rounded-lg shadow p-6 mb-8 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
        >
          <h2
            className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
          >
            パスワードを設定
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3">
                <p className="text-sm text-green-700 dark:text-green-400">
                  {formSuccess}
                </p>
              </div>
            )}

            <div>
              <label
                className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                クリニック
              </label>
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="">クリニックを選択...</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name} {clinic.hasPassword ? '(設定済み)' : '(未設定)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                新しいパスワード（8文字以上）
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label
                className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                パスワード確認
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? '設定中...' : 'パスワードを設定'}
            </button>
          </form>
        </div>

        {/* パスワード設定状況一覧 */}
        <div
          className={`rounded-lg shadow overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
        >
          <div
            className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
          >
            <h2
              className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
            >
              パスワード設定状況
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                読み込み中...
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className={isDark ? 'bg-slate-700' : 'bg-slate-50'}>
                <tr>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    クリニック名
                  </th>
                  <th
                    className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    ステータス
                  </th>
                  <th
                    className={`px-6 py-3 text-center text-xs font-medium uppercase ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  >
                    最終更新
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}
              >
                {clinics.map((clinic) => (
                  <tr
                    key={clinic.id}
                    className={isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}
                  >
                    <td
                      className={`px-6 py-4 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}
                    >
                      <div className="text-sm font-medium">{clinic.name}</div>
                      <div
                        className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                      >
                        {clinic.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {clinic.hasPassword ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          設定済み
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          未設定
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {formatDate(clinic.passwordUpdatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
