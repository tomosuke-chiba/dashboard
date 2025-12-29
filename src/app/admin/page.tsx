'use client';

import { useState, useEffect } from 'react';
import ClinicList from '@/components/ClinicList';

interface ClinicWithMetrics {
  id: string;
  name: string;
  slug: string;
  currentMetrics: {
    pv_count: number;
    application_count: number;
    recorded_at: string | null;
  };
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [clinics, setClinics] = useState<ClinicWithMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 簡易パスワードチェック
    if (password === 'admin' || password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setError('');
    } else {
      setError('パスワードが正しくありません');
    }
  };

  useEffect(() => {
    const authenticated = sessionStorage.getItem('admin_authenticated');
    if (authenticated === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClinics();
    }
  }, [isAuthenticated]);

  const fetchClinics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinics');
      const data = await res.json();
      setClinics(data.clinics || []);
    } catch (err) {
      console.error('Error fetching clinics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScrape = async () => {
    if (!confirm('全クライアントのデータを取得しますか？')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      alert(`スクレイピング完了: ${data.results?.length || 0}件処理`);
      fetchClinics();
    } catch (err) {
      console.error('Error during scrape:', err);
      alert('スクレイピング中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">管理者ログイン</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを入力"
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">管理ダッシュボード</h1>
            <p className="text-sm text-gray-500 mt-1">全クライアント一覧</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleManualScrape}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? '処理中...' : '手動でデータ取得'}
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_authenticated');
                setIsAuthenticated(false);
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : clinics.length > 0 ? (
          <ClinicList clinics={clinics} />
        ) : (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-500">登録されているクライアントがありません</p>
            <p className="text-sm text-gray-400 mt-2">
              データベースにクライアントを追加してください
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
