'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoalForm, HireForm } from '@/components/GoalForm';
import { JOB_TYPES, SOURCES, CHANNELS } from '@/lib/goals';
import { TemplateCard, BannerCard } from '@/components/TemplateCard';
import { GuppyTemplateForm, JobMedleyTemplateForm, BannerForm } from '@/components/TemplateForm';
import type { GuppyScoutTemplate, JobMedleyScoutTemplate, Banner } from '@/lib/templates';

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

interface GoalProgress {
  goal: {
    id: string;
    jobType: string;
    targetCount: number;
    currentCount: number;
    contractStartDate: string;
    contractDurationMonths: number;
  };
  progressRate: number;
  remainingCount: number;
  remainingDays: number;
  isOnTrack: boolean;
  expectedCompletionRate: number;
}

interface Hire {
  id: string;
  hireDate: string;
  jobType: string;
  source: string;
  channel: string | null;
  name: string | null;
  memo: string | null;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'goals' | 'hires' | 'templates' | 'banners'>('goals');
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [hires, setHires] = useState<Hire[]>([]);
  const [guppyTemplates, setGuppyTemplates] = useState<GuppyScoutTemplate[]>([]);
  const [jobmedleyTemplates, setJobmedleyTemplates] = useState<JobMedleyScoutTemplate[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [templateSource, setTemplateSource] = useState<'guppy' | 'jobmedley'>('guppy');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 認証チェック
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!data.authenticated || !data.isAdmin) {
          router.push(`/clinic/${slug}`);
          return;
        }

        setIsAdmin(true);
        setIsLoading(false);
      } catch {
        router.push(`/clinic/${slug}`);
      }
    }

    checkAuth();
  }, [slug, router]);

  // データ取得
  const fetchData = async () => {
    try {
      const [goalsRes, hiresRes, guppyRes, jobmedleyRes, bannersRes] = await Promise.all([
        fetch(`/api/goals?slug=${slug}`),
        fetch(`/api/hires?slug=${slug}`),
        fetch(`/api/templates/guppy?slug=${slug}`),
        fetch(`/api/templates/jobmedley?slug=${slug}`),
        fetch(`/api/banners?slug=${slug}`),
      ]);

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData.goals || []);
      }

      if (hiresRes.ok) {
        const hiresData = await hiresRes.json();
        setHires(hiresData.hires || []);
      }

      if (guppyRes.ok) {
        const guppyData = await guppyRes.json();
        setGuppyTemplates(guppyData.templates || []);
      }

      if (jobmedleyRes.ok) {
        const jobmedleyData = await jobmedleyRes.json();
        setJobmedleyTemplates(jobmedleyData.templates || []);
      }

      if (bannersRes.ok) {
        const bannersData = await bannersRes.json();
        setBanners(bannersData.banners || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, slug]);

  const handleDeleteHire = async (hireId: string) => {
    if (!confirm('この採用記録を削除しますか？')) return;

    try {
      const response = await fetch(`/api/hires?id=${hireId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete hire:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('この目標を削除しますか？')) return;

    try {
      const response = await fetch(`/api/goals?id=${goalId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const handleDeleteGuppyTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/guppy?id=${templateId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleToggleGuppyTemplate = async (templateId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/templates/guppy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, isActive }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const handleDeleteJobmedleyTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/jobmedley?id=${templateId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleToggleJobmedleyTemplate = async (templateId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/templates/jobmedley', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, isActive }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    try {
      const response = await fetch(`/api/banners?id=${bannerId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to delete banner:', error);
    }
  };

  const handleToggleBanner = async (bannerId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bannerId, isActive }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link
            href={`/clinic/${slug}`}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-2 inline-block"
          >
            ← ダッシュボードに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">設定</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">目標設定・採用登録（管理者専用）</p>
        </div>

        {/* タブ */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('goals')}
            className={`pb-3 px-1 font-medium text-sm whitespace-nowrap ${
              activeTab === 'goals'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            採用目標
          </button>
          <button
            onClick={() => setActiveTab('hires')}
            className={`pb-3 px-1 font-medium text-sm whitespace-nowrap ${
              activeTab === 'hires'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            採用記録
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-1 font-medium text-sm whitespace-nowrap ${
              activeTab === 'templates'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            スカウト文面
          </button>
          <button
            onClick={() => setActiveTab('banners')}
            className={`pb-3 px-1 font-medium text-sm whitespace-nowrap ${
              activeTab === 'banners'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            バナー管理
          </button>
        </div>

        {activeTab === 'goals' && (
          <div className="space-y-8">
            {/* 目標設定フォーム */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                新しい目標を設定
              </h2>
              <GoalForm slug={slug} onSuccess={fetchData} />
            </div>

            {/* 現在の目標一覧 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                設定済みの目標
              </h2>
              {goals.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">目標が設定されていません</p>
              ) : (
                <div className="space-y-4">
                  {goals.map((g) => (
                    <div
                      key={g.goal.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {JOB_TYPES.find((jt) => jt.value === g.goal.jobType)?.label || g.goal.jobType}
                        </span>
                        <span className="mx-2 text-gray-400">|</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          目標: {g.goal.targetCount}人
                        </span>
                        <span className="mx-2 text-gray-400">|</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          現在: {g.goal.currentCount}人
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(g.goal.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hires' && (
          <div className="space-y-8">
            {/* 採用登録フォーム */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                採用を登録
              </h2>
              <HireForm slug={slug} onSuccess={fetchData} />
            </div>

            {/* 採用記録一覧 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                採用記録
              </h2>
              {hires.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">採用記録がありません</p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          日付
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          職種
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          媒体
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          経路
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          氏名
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {hires.map((hire) => (
                        <tr key={hire.id}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {hire.hireDate}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {JOB_TYPES.find((jt) => jt.value === hire.jobType)?.label || hire.jobType}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {SOURCES.find((s) => s.value === hire.source)?.label || hire.source}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {hire.channel
                              ? CHANNELS.find((c) => c.value === hire.channel)?.label || hire.channel
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {hire.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteHire(hire.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-8">
            {/* 媒体切り替え */}
            <div className="flex gap-2">
              <button
                onClick={() => setTemplateSource('guppy')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  templateSource === 'guppy'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                GUPPY
              </button>
              <button
                onClick={() => setTemplateSource('jobmedley')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  templateSource === 'jobmedley'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                ジョブメドレー
              </button>
            </div>

            {/* GUPPY文面 */}
            {templateSource === 'guppy' && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    GUPPYスカウト文面を登録
                  </h2>
                  <GuppyTemplateForm slug={slug} onSuccess={fetchData} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    登録済み文面（{guppyTemplates.length}件）
                  </h2>
                  {guppyTemplates.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">文面が登録されていません</p>
                  ) : (
                    <div className="space-y-4">
                      {guppyTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          type="guppy"
                          id={template.id}
                          templateName={template.templateName}
                          jobType={template.jobType}
                          subject={template.subject}
                          body={template.body}
                          linkCtaText={template.linkCtaText}
                          usedFrom={template.usedFrom}
                          usedTo={template.usedTo}
                          isActive={template.isActive}
                          createdAt={template.createdAt}
                          isAdmin={true}
                          onDelete={handleDeleteGuppyTemplate}
                          onToggleActive={handleToggleGuppyTemplate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ジョブメドレー文面 */}
            {templateSource === 'jobmedley' && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    ジョブメドレースカウト文面を登録
                  </h2>
                  <JobMedleyTemplateForm slug={slug} onSuccess={fetchData} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    登録済み文面（{jobmedleyTemplates.length}件）
                  </h2>
                  {jobmedleyTemplates.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">文面が登録されていません</p>
                  ) : (
                    <div className="space-y-4">
                      {jobmedleyTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          type="jobmedley"
                          id={template.id}
                          templateName={template.templateName}
                          jobOfferId={template.jobOfferId}
                          firstSentence={template.firstSentence}
                          body={template.body}
                          targetCriteria={template.targetCriteria}
                          usedFrom={template.usedFrom}
                          usedTo={template.usedTo}
                          isActive={template.isActive}
                          createdAt={template.createdAt}
                          isAdmin={true}
                          onDelete={handleDeleteJobmedleyTemplate}
                          onToggleActive={handleToggleJobmedleyTemplate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="space-y-8">
            {/* バナー登録フォーム */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                バナーを登録
              </h2>
              <BannerForm slug={slug} onSuccess={fetchData} />
            </div>

            {/* バナー一覧 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                登録済みバナー（{banners.length}件）
              </h2>
              {banners.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">バナーが登録されていません</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {banners.map((banner) => (
                    <BannerCard
                      key={banner.id}
                      id={banner.id}
                      source={banner.source}
                      bannerName={banner.bannerName}
                      imageUrl={banner.imageUrl}
                      copyText={banner.copyText}
                      description={banner.description}
                      usedFrom={banner.usedFrom}
                      usedTo={banner.usedTo}
                      isActive={banner.isActive}
                      createdAt={banner.createdAt}
                      isAdmin={true}
                      onDelete={handleDeleteBanner}
                      onToggleActive={handleToggleBanner}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
