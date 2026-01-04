'use client';

import { JOB_TYPES } from '@/lib/goals';

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

interface GoalProgressCardProps {
  progress: GoalProgress;
  showDetails?: boolean;
}

export function GoalProgressCard({ progress, showDetails = false }: GoalProgressCardProps) {
  const { goal, progressRate, remainingCount, remainingDays, isOnTrack } = progress;

  const jobTypeLabel = JOB_TYPES.find((jt) => jt.value === goal.jobType)?.label || goal.jobType;
  const progressPercent = Math.round(progressRate * 100);

  // 色の決定
  const getStatusColor = () => {
    if (progressRate >= 1) return 'text-green-600 dark:text-green-400';
    if (isOnTrack) return 'text-blue-600 dark:text-blue-400';
    if (progressRate >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressBarColor = () => {
    if (progressRate >= 1) return 'bg-green-500';
    if (isOnTrack) return 'bg-blue-500';
    if (progressRate >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = () => {
    if (progressRate >= 1) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          達成
        </span>
      );
    }
    if (isOnTrack) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          順調
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        遅延
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{jobTypeLabel}</h3>
        {getStatusBadge()}
      </div>

      {/* 進捗数値 */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-3xl font-bold ${getStatusColor()}`}>{goal.currentCount}</span>
        <span className="text-gray-500 dark:text-gray-400">/ {goal.targetCount}人</span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-3">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        ></div>
      </div>

      {/* 詳細情報 */}
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>進捗: {progressPercent}%</span>
        <span>残り: {remainingCount}人</span>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>契約開始</span>
            <span>{goal.contractStartDate}</span>
          </div>
          <div className="flex justify-between">
            <span>残り日数</span>
            <span>{remainingDays}日</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface GoalProgressListProps {
  goals: GoalProgress[];
  showDetails?: boolean;
}

export function GoalProgressList({ goals, showDetails = false }: GoalProgressListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        目標が設定されていません
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {goals.map((progress) => (
        <GoalProgressCard key={progress.goal.id} progress={progress} showDetails={showDetails} />
      ))}
    </div>
  );
}

interface GoalSummaryProps {
  goals: GoalProgress[];
}

export function GoalSummary({ goals }: GoalSummaryProps) {
  if (goals.length === 0) return null;

  const totalTarget = goals.reduce((sum, g) => sum + g.goal.targetCount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.goal.currentCount, 0);
  const totalProgress = totalTarget > 0 ? totalCurrent / totalTarget : 0;
  const onTrackCount = goals.filter((g) => g.isOnTrack || g.progressRate >= 1).length;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg shadow p-6 text-white mb-6">
      <h2 className="text-lg font-semibold mb-4">採用目標サマリー</h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-3xl font-bold">{totalCurrent}/{totalTarget}</div>
          <div className="text-blue-100 text-sm">総採用数/目標</div>
        </div>
        <div>
          <div className="text-3xl font-bold">{Math.round(totalProgress * 100)}%</div>
          <div className="text-blue-100 text-sm">全体進捗</div>
        </div>
        <div>
          <div className="text-3xl font-bold">{onTrackCount}/{goals.length}</div>
          <div className="text-blue-100 text-sm">順調な職種</div>
        </div>
      </div>
    </div>
  );
}
