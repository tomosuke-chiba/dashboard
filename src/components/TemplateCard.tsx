'use client';

import { useState } from 'react';
import { getJobTypeLabel } from '@/lib/templates';

interface TemplateCardBaseProps {
  id: string;
  templateName: string;
  isActive: boolean;
  usedFrom: string | null;
  usedTo: string | null;
  createdAt: string;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  isAdmin?: boolean;
}

interface GuppyTemplateCardProps extends TemplateCardBaseProps {
  type: 'guppy';
  jobType: string | null;
  subject: string | null;
  body: string | null;
  linkCtaText: string | null;
}

interface JobMedleyTemplateCardProps extends TemplateCardBaseProps {
  type: 'jobmedley';
  jobOfferId: string | null;
  firstSentence: string | null;
  body: string | null;
  targetCriteria: string | null;
}

type TemplateCardProps = GuppyTemplateCardProps | JobMedleyTemplateCardProps;

export function TemplateCard(props: TemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = () => {
    const now = new Date().toISOString().split('T')[0];
    const isInPeriod =
      (!props.usedFrom || props.usedFrom <= now) &&
      (!props.usedTo || props.usedTo >= now);

    if (!props.isActive) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          無効
        </span>
      );
    }
    if (isInPeriod) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          使用中
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        期間外
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ヘッダー */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {props.templateName}
            </h3>
            {getStatusBadge()}
            {props.type === 'guppy' && props.jobType && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({getJobTypeLabel(props.jobType)})
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* プレビュー */}
        {!isExpanded && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {props.type === 'guppy' ? props.subject : props.firstSentence}
          </p>
        )}
      </div>

      {/* 展開時の詳細 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700">
          {props.type === 'guppy' ? (
            <>
              {props.subject && (
                <div className="pt-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    件名
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{props.subject}</p>
                </div>
              )}
              {props.body && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    本文
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {props.body}
                  </p>
                </div>
              )}
              {props.linkCtaText && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    リンク訴求文
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{props.linkCtaText}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {props.firstSentence && (
                <div className="pt-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    1文目
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{props.firstSentence}</p>
                </div>
              )}
              {props.body && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    本文
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {props.body}
                  </p>
                </div>
              )}
              {props.targetCriteria && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    対象条件
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{props.targetCriteria}</p>
                </div>
              )}
            </>
          )}

          {/* 使用期間 */}
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
            {props.usedFrom && (
              <span>開始: {formatDate(props.usedFrom)}</span>
            )}
            {props.usedTo && (
              <span>終了: {formatDate(props.usedTo)}</span>
            )}
            <span>作成: {formatDate(props.createdAt)}</span>
          </div>

          {/* アクション */}
          {props.isAdmin && (
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  props.onToggleActive?.(props.id, !props.isActive);
                }}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  props.isActive
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                }`}
              >
                {props.isActive ? '無効にする' : '有効にする'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('この文面を削除しますか？')) {
                    props.onDelete?.(props.id);
                  }
                }}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md"
              >
                削除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// バナーカード
interface BannerCardProps {
  id: string;
  source: 'guppy' | 'jobmedley';
  bannerName: string;
  imageUrl: string | null;
  copyText: string | null;
  description: string | null;
  usedFrom: string | null;
  usedTo: string | null;
  isActive: boolean;
  createdAt: string;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  isAdmin?: boolean;
}

export function BannerCard(props: BannerCardProps) {
  const getSourceLabel = () => {
    return props.source === 'guppy' ? 'GUPPY' : 'ジョブメドレー';
  };

  const getStatusBadge = () => {
    const now = new Date().toISOString().split('T')[0];
    const isInPeriod =
      (!props.usedFrom || props.usedFrom <= now) &&
      (!props.usedTo || props.usedTo >= now);

    if (!props.isActive) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          無効
        </span>
      );
    }
    if (isInPeriod) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          使用中
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        期間外
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* バナー画像 */}
      {props.imageUrl && (
        <div className="aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <img
            src={props.imageUrl}
            alt={props.bannerName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 情報 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {props.bannerName}
            </h3>
            {getStatusBadge()}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {getSourceLabel()}
          </span>
        </div>

        {props.copyText && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {props.copyText}
          </p>
        )}

        {props.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {props.description}
          </p>
        )}

        {/* アクション */}
        {props.isAdmin && (
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => props.onToggleActive?.(props.id, !props.isActive)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                props.isActive
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
              }`}
            >
              {props.isActive ? '無効にする' : '有効にする'}
            </button>
            <button
              onClick={() => {
                if (confirm('このバナーを削除しますか？')) {
                  props.onDelete?.(props.id);
                }
              }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md"
            >
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
