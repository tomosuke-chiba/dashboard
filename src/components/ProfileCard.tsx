'use client';

import { getAlertColor, AlertLevel } from '@/lib/kpi';

// ============================================
// GUPPYプロフィールカード
// ============================================

interface GuppyProfileCardProps {
  completeness: number | null;
  independenceSupport: boolean | null;
  updatedAt: string | null;
  scrapedAt: string | null;
}

export function GuppyProfileCard({
  completeness,
  independenceSupport,
  updatedAt,
  scrapedAt,
}: GuppyProfileCardProps) {
  // 充実度のアラートレベルを判定
  const getCompletenessLevel = (value: number | null): AlertLevel => {
    if (value === null) return 'neutral';
    if (value >= 80) return 'success';
    if (value >= 50) return 'warning';
    return 'danger';
  };

  const completenessLevel = getCompletenessLevel(completeness);
  const colors = getAlertColor(completenessLevel);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        GUPPYプロフィール情報
      </h3>

      <div className="space-y-3">
        {/* プロフィール充実度 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">プロフィール充実度</span>
            <span className={`text-sm font-bold ${colors.text}`}>
              {completeness !== null ? `${completeness}%` : '—'}
            </span>
          </div>
          {completeness !== null && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  completenessLevel === 'success'
                    ? 'bg-green-500'
                    : completenessLevel === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(completeness, 100)}%` }}
              />
            </div>
          )}
          {completenessLevel === 'danger' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              プロフィールを充実させてください
            </p>
          )}
        </div>

        {/* 独立応援資金 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">独立応援資金設定</span>
        {independenceSupport === null ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            未取得
          </span>
        ) : independenceSupport ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            設定済み
          </span>
        ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              未設定
            </span>
          )}
        </div>

        {/* 更新日 */}
        {updatedAt && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">最終更新</span>
            <span className="text-xs text-gray-900 dark:text-white">
              {new Date(updatedAt).toLocaleDateString('ja-JP')}
            </span>
          </div>
        )}

        {/* スクレイピング日時 */}
        {scrapedAt && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400">取得日時</span>
            <span className="text-xs text-gray-400">
              {new Date(scrapedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ジョブメドレー重要指標カード
// ============================================

interface JobMedleyIndicatorCardProps {
  jobOfferId: string;
  name: string;
  hasSpeedReplyBadge: boolean;
  hasStaffVoice: boolean;
  hasWorkplaceInfo: boolean;
  photoCount: number;
  daysSinceUpdate: number | null;
  featureTags: string[];
  scrapedAt: string | null;
}

export function JobMedleyIndicatorCard({
  name,
  hasSpeedReplyBadge,
  hasStaffVoice,
  hasWorkplaceInfo,
  photoCount,
  daysSinceUpdate,
  featureTags,
  scrapedAt,
}: JobMedleyIndicatorCardProps) {
  // 更新日数のアラートレベル
  const getUpdateLevel = (days: number | null): AlertLevel => {
    if (days === null) return 'neutral';
    if (days <= 15) return 'success';
    if (days <= 30) return 'warning';
    return 'danger';
  };

  // 写真枚数のアラートレベル
  const getPhotoLevel = (count: number): AlertLevel => {
    if (count >= 8) return 'success';
    if (count >= 4) return 'warning';
    return 'danger';
  };

  const updateLevel = getUpdateLevel(daysSinceUpdate);
  const photoLevel = getPhotoLevel(photoCount);
  const updateColors = getAlertColor(updateLevel);
  const photoColors = getAlertColor(photoLevel);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
        {name || 'ジョブメドレー求人'}
      </h3>

      <div className="space-y-3">
        {/* スピード返信アイコン */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">スピード返信アイコン</span>
          {hasSpeedReplyBadge ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              表示中
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              未表示
            </span>
          )}
        </div>

        {/* 職員の声 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">職員の声</span>
          {hasStaffVoice ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              登録済み
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              未登録
            </span>
          )}
        </div>

        {/* 職場環境情報 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">職場環境情報</span>
          {hasWorkplaceInfo ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              登録済み
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              未登録
            </span>
          )}
        </div>

        {/* 写真枚数 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">掲載写真</span>
          <span className={`text-xs font-medium ${photoColors.text}`}>
            {photoCount}枚
            {photoLevel === 'danger' && (
              <span className="text-red-500 ml-1">(最低4枚必要)</span>
            )}
          </span>
        </div>

        {/* 更新からの経過日数 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">原稿更新から</span>
          <span className={`text-xs font-medium ${updateColors.text}`}>
            {daysSinceUpdate !== null ? `${daysSinceUpdate}日` : '—'}
            {updateLevel === 'danger' && (
              <span className="text-red-500 ml-1">(要更新)</span>
            )}
          </span>
        </div>

        {/* 特徴タグ */}
        {featureTags.length > 0 && (
          <div>
            <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">特徴タグ</span>
            <div className="flex flex-wrap gap-1">
              {featureTags.slice(0, 5).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
              {featureTags.length > 5 && (
                <span className="text-xs text-gray-400">+{featureTags.length - 5}</span>
              )}
            </div>
          </div>
        )}

        {/* 改善提案 */}
        {(!hasSpeedReplyBadge || !hasStaffVoice || !hasWorkplaceInfo || photoCount < 4 || (daysSinceUpdate !== null && daysSinceUpdate > 30)) && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">改善ポイント:</p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-400 list-disc list-inside space-y-0.5">
              {!hasSpeedReplyBadge && <li>24時間以内返信でスピード返信アイコンを獲得</li>}
              {!hasStaffVoice && <li>職員の声を登録して特集ページに掲載</li>}
              {!hasWorkplaceInfo && <li>職場環境情報を登録して理解を促進</li>}
              {photoCount < 4 && <li>写真を最低4枚（外観/内観/スタッフ/設備）に増やす</li>}
              {daysSinceUpdate !== null && daysSinceUpdate > 30 && <li>原稿を更新して新着順で上位表示</li>}
            </ul>
          </div>
        )}

        {/* スクレイピング日時 */}
        {scrapedAt && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400">取得日時</span>
            <span className="text-xs text-gray-400">
              {new Date(scrapedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 重要指標サマリーセクション
// ============================================

interface IndicatorsSummaryProps {
  guppyProfile?: GuppyProfileCardProps | null;
  jobMedleyIndicators?: JobMedleyIndicatorCardProps[];
}

export function IndicatorsSummary({
  guppyProfile,
  jobMedleyIndicators = [],
}: IndicatorsSummaryProps) {
  // 全体のスコアを計算
  const calculateOverallScore = (): { score: number; maxScore: number } => {
    let score = 0;
    let maxScore = 0;

    // GUPPYプロフィール
    if (guppyProfile) {
      maxScore += 2;
      if (guppyProfile.completeness && guppyProfile.completeness >= 80) score += 1;
      if (guppyProfile.independenceSupport) score += 1;
    }

    // ジョブメドレー指標
    for (const indicator of jobMedleyIndicators) {
      maxScore += 5;
      if (indicator.hasSpeedReplyBadge) score += 1;
      if (indicator.hasStaffVoice) score += 1;
      if (indicator.hasWorkplaceInfo) score += 1;
      if (indicator.photoCount >= 4) score += 1;
      if (indicator.daysSinceUpdate !== null && indicator.daysSinceUpdate <= 30) score += 1;
    }

    return { score, maxScore };
  };

  const { score, maxScore } = calculateOverallScore();
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 全体スコア */}
      {maxScore > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              プロフィール・重要指標スコア
            </h3>
            <span className={`text-lg font-bold ${
              percentage >= 80 ? 'text-green-600 dark:text-green-400' :
              percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {score}/{maxScore} ({percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                percentage >= 80 ? 'bg-green-500' :
                percentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* カードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guppyProfile && <GuppyProfileCard {...guppyProfile} />}
        {jobMedleyIndicators.map((indicator) => (
          <JobMedleyIndicatorCard key={indicator.jobOfferId} {...indicator} />
        ))}
      </div>
    </div>
  );
}
