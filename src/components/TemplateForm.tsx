'use client';

import { useState } from 'react';
import { JOB_TYPES } from '@/lib/goals';

interface GuppyTemplateFormProps {
  slug: string;
  onSuccess?: () => void;
}

export function GuppyTemplateForm({ slug, onSuccess }: GuppyTemplateFormProps) {
  const [templateName, setTemplateName] = useState('');
  const [jobType, setJobType] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [linkCtaText, setLinkCtaText] = useState('');
  const [usedFrom, setUsedFrom] = useState('');
  const [usedTo, setUsedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/templates/guppy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          templateName,
          jobType: jobType || undefined,
          subject: subject || undefined,
          body: body || undefined,
          linkCtaText: linkCtaText || undefined,
          usedFrom: usedFrom || undefined,
          usedTo: usedTo || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '保存に失敗しました');
        return;
      }

      setSuccess('文面を登録しました');
      // フォームをリセット
      setTemplateName('');
      setJobType('');
      setSubject('');
      setBody('');
      setLinkCtaText('');
      setUsedFrom('');
      setUsedTo('');
      onSuccess?.();
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            テンプレート名 *
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: 2026年1月用"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            対象職種
          </label>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全職種</option>
            {JOB_TYPES.map((jt) => (
              <option key={jt.value} value={jt.value}>
                {jt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          件名
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="スカウトメールの件名"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          本文
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="スカウトメールの本文"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          リンク訴求文（Bitlyリンク前）
        </label>
        <input
          type="text"
          value={linkCtaText}
          onChange={(e) => setLinkCtaText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="例: 詳細はこちらをご覧ください"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            使用開始日
          </label>
          <input
            type="date"
            value={usedFrom}
            onChange={(e) => setUsedFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            使用終了日
          </label>
          <input
            type="date"
            value={usedTo}
            onChange={(e) => setUsedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '保存中...' : '文面を登録'}
      </button>
    </form>
  );
}

interface JobMedleyTemplateFormProps {
  slug: string;
  onSuccess?: () => void;
}

export function JobMedleyTemplateForm({ slug, onSuccess }: JobMedleyTemplateFormProps) {
  const [templateName, setTemplateName] = useState('');
  const [firstSentence, setFirstSentence] = useState('');
  const [body, setBody] = useState('');
  const [targetCriteria, setTargetCriteria] = useState('');
  const [usedFrom, setUsedFrom] = useState('');
  const [usedTo, setUsedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/templates/jobmedley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          templateName,
          firstSentence: firstSentence || undefined,
          body: body || undefined,
          targetCriteria: targetCriteria || undefined,
          usedFrom: usedFrom || undefined,
          usedTo: usedTo || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '保存に失敗しました');
        return;
      }

      setSuccess('文面を登録しました');
      setTemplateName('');
      setFirstSentence('');
      setBody('');
      setTargetCriteria('');
      setUsedFrom('');
      setUsedTo('');
      onSuccess?.();
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-sm">
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          テンプレート名 *
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="例: 歯科衛生士向け"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          1文目（最重要 - プレビューに表示されます）
        </label>
        <textarea
          value={firstSentence}
          onChange={(e) => setFirstSentence(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="最初の1文を入力（プレビューに表示されます）"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          本文
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="スカウトメールの本文"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          対象条件
        </label>
        <input
          type="text"
          value={targetCriteria}
          onChange={(e) => setTargetCriteria(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="例: 経験3年以上の歯科衛生士"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            使用開始日
          </label>
          <input
            type="date"
            value={usedFrom}
            onChange={(e) => setUsedFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            使用終了日
          </label>
          <input
            type="date"
            value={usedTo}
            onChange={(e) => setUsedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '保存中...' : '文面を登録'}
      </button>
    </form>
  );
}

interface BannerFormProps {
  slug: string;
  onSuccess?: () => void;
}

export function BannerForm({ slug, onSuccess }: BannerFormProps) {
  const [source, setSource] = useState<'guppy' | 'jobmedley'>('guppy');
  const [bannerName, setBannerName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [copyText, setCopyText] = useState('');
  const [description, setDescription] = useState('');
  const [usedFrom, setUsedFrom] = useState('');
  const [usedTo, setUsedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          source,
          bannerName,
          imageUrl: imageUrl || undefined,
          copyText: copyText || undefined,
          description: description || undefined,
          usedFrom: usedFrom || undefined,
          usedTo: usedTo || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '保存に失敗しました');
        return;
      }

      setSuccess('バナーを登録しました');
      setBannerName('');
      setImageUrl('');
      setCopyText('');
      setDescription('');
      setUsedFrom('');
      setUsedTo('');
      onSuccess?.();
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            媒体 *
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'guppy' | 'jobmedley')}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="guppy">GUPPY</option>
            <option value="jobmedley">ジョブメドレー</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            バナー名 *
          </label>
          <input
            type="text"
            value={bannerName}
            onChange={(e) => setBannerName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: メインバナーv2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          画像URL
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://example.com/banner.jpg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          コピー・文言
        </label>
        <textarea
          value={copyText}
          onChange={(e) => setCopyText(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="バナーに対応するコピー・キャッチコピー"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          説明・メモ
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="内部メモ（任意）"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            使用開始日
          </label>
          <input
            type="date"
            value={usedFrom}
            onChange={(e) => setUsedFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            使用終了日
          </label>
          <input
            type="date"
            value={usedTo}
            onChange={(e) => setUsedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '保存中...' : 'バナーを登録'}
      </button>
    </form>
  );
}
