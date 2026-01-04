'use client';

import { useState } from 'react';
import {
  AlertLevel,
  KPIAlert,
  getAlertColor,
  Solution,
} from '@/lib/kpi';

// ============================================
// KPIサマリーカード
// ============================================

interface KPICardProps {
  title: string;
  value: number;
  unit: string;
  level: AlertLevel;
  message?: string;
  solution?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function KPICard({ title, value, unit, level, message, solution, trend }: KPICardProps) {
  const [showSolution, setShowSolution] = useState(false);
  const colors = getAlertColor(level);

  return (
    <div className={`rounded-lg border-l-4 ${colors.border} ${colors.bgLight} p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <div className="mt-1 flex items-baseline">
            <p className={`text-2xl font-bold ${colors.text}`}>
              {typeof value === 'number' ? value.toFixed(1) : value}
            </p>
            <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">{unit}</span>
            {trend && (
              <span
                className={`ml-2 text-sm ${
                  trend.isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
      </div>

      {message && (
        <p className={`mt-2 text-sm ${colors.text}`}>{message}</p>
      )}

      {solution && level !== 'neutral' && level !== 'success' && (
        <div className="mt-2">
          <button
            onClick={() => setShowSolution(!showSolution)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showSolution ? '施策を隠す' : '改善施策を見る'}
          </button>
          {showSolution && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 p-2 rounded">
              {solution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// KPIカードグリッド
// ============================================

interface KPIGridProps {
  kpis: Array<{
    title: string;
    value: number;
    unit: string;
    level: AlertLevel;
    message?: string;
    solution?: string;
  }>;
}

export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  );
}

// ============================================
// アラート一覧
// ============================================

interface AlertListProps {
  alerts: KPIAlert[];
  showAll?: boolean;
}

export function AlertList({ alerts, showAll = false }: AlertListProps) {
  const [expanded, setExpanded] = useState(showAll);

  // 危険・警告アラートのみフィルタリング
  const activeAlerts = alerts.filter(
    (a) => a.level === 'danger' || (a.level === 'warning' && a.message)
  );
  const successAlerts = alerts.filter((a) => a.level === 'success' && a.message);

  const displayAlerts = expanded ? activeAlerts : activeAlerts.slice(0, 3);

  if (activeAlerts.length === 0 && successAlerts.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-green-600 dark:text-green-400 text-lg mr-2">✓</span>
          <p className="text-green-700 dark:text-green-300">
            現在、対応が必要なアラートはありません
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 警告・危険アラート */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            要対応（{activeAlerts.length}件）
          </h4>
          {displayAlerts.map((alert, index) => (
            <AlertItem key={index} alert={alert} />
          ))}
          {activeAlerts.length > 3 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              さらに {activeAlerts.length - 3} 件を表示
            </button>
          )}
        </div>
      )}

      {/* 優良アラート */}
      {successAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            優良指標（{successAlerts.length}件）
          </h4>
          {successAlerts.slice(0, 3).map((alert, index) => (
            <AlertItem key={index} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// アラートアイテム
// ============================================

interface AlertItemProps {
  alert: KPIAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const [showSolution, setShowSolution] = useState(false);
  const colors = getAlertColor(alert.level);

  const sourceLabel = {
    guppy: 'GUPPY',
    jobmedley: 'ジョブメドレー',
    quacareer: 'クオキャリア',
    integrated: '全体',
  }[alert.source];

  const categoryLabel = {
    view: '閲覧経路',
    scout: 'スカウト経路',
    integrated: '統合',
  }[alert.category];

  return (
    <div className={`rounded-lg ${colors.bgLight} border ${colors.border} p-3`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {sourceLabel}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {categoryLabel}
            </span>
          </div>
          <p className={`text-sm font-medium ${colors.text}`}>
            {alert.kpiName}: {alert.value.toFixed(1)}{alert.unit}
          </p>
          {alert.message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {alert.message}
            </p>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full ${colors.bg} flex-shrink-0 mt-1`} />
      </div>

      {alert.solution && alert.level !== 'success' && (
        <div className="mt-2">
          <button
            onClick={() => setShowSolution(!showSolution)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showSolution ? '施策を隠す' : '改善施策を見る'}
          </button>
          {showSolution && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 p-2 rounded">
              {alert.solution}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// 施策対応表
// ============================================

interface SolutionTableProps {
  title: string;
  solutions: Solution[];
}

export function SolutionTable({ title, solutions }: SolutionTableProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {solutions.map((item, index) => (
          <div key={index} className="p-4">
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full text-left flex items-center justify-between"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.problem}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedIndex === index ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedIndex === index && (
              <div className="mt-3 space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  {item.solutions.map((solution, sIndex) => (
                    <li key={sIndex} className="text-sm text-gray-600 dark:text-gray-400">
                      {solution}
                    </li>
                  ))}
                </ul>
                {item.note && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-2">
                    ※ {item.note}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// KPIサマリーセクション
// ============================================

interface KPISummaryProps {
  title: string;
  description?: string;
  kpis: Array<{
    title: string;
    value: number;
    unit: string;
    level: AlertLevel;
    message?: string;
    solution?: string;
  }>;
  alerts?: KPIAlert[];
}

export function KPISummary({ title, description, kpis, alerts }: KPISummaryProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>

      <KPIGrid kpis={kpis} />

      {alerts && alerts.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            アラート
          </h4>
          <AlertList alerts={alerts} />
        </div>
      )}
    </div>
  );
}

// ============================================
// 色付きセル（テーブル用）
// ============================================

interface ColoredCellProps {
  value: number;
  level: AlertLevel;
  suffix?: string;
  className?: string;
}

export function ColoredCell({ value, level, suffix = '', className = '' }: ColoredCellProps) {
  const colors = getAlertColor(level);

  if (level === 'neutral') {
    return (
      <span className={className}>
        {value.toFixed(1)}{suffix}
      </span>
    );
  }

  return (
    <span
      className={`px-2 py-0.5 rounded ${colors.bgLight} ${colors.text} font-medium ${className}`}
    >
      {value.toFixed(1)}{suffix}
    </span>
  );
}
