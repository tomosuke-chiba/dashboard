/**
 * KPIアラート機能
 * Phase D: KPIサマリーカード・アラート判定・施策対応表
 */

// ============================================
// KPI閾値定義
// ============================================

export type AlertLevel = 'danger' | 'warning' | 'success' | 'neutral';

interface KPIThreshold {
  dangerMax?: number;    // この値以下で赤
  dangerMin?: number;    // この値以上で赤（不正検知用）
  warningMin: number;    // 黄色の下限
  warningMax: number;    // 黄色の上限
  successMin: number;    // 緑の下限
}

interface KPIDefinition {
  id: string;
  name: string;
  unit: string;
  threshold: KPIThreshold;
  dangerAlert: string;
  successAlert: string;
  solution: string;
  higherIsBetter: boolean;  // 数値が高い方が良いか
}

// GUPPY（閲覧経路）のKPI定義
export const GUPPY_VIEW_KPIS: Record<string, KPIDefinition> = {
  viewRate: {
    id: 'viewRate',
    name: '閲覧率',
    unit: '%',
    threshold: {
      dangerMax: 5,
      dangerMin: 30,  // 30%超は不正検知
      warningMin: 8,
      warningMax: 15,
      successMin: 15,
    },
    dangerAlert: '⚠️ タイトル・写真を改善してください',
    successAlert: '✨ 優秀です！さらに応募率改善に注力しましょう',
    solution: '①求人タイトルを変更（具体的な給与・勤務地を明記）②メイン写真を変更（明るく、魅力的なものに）',
    higherIsBetter: true,
  },
  applicationRate: {
    id: 'applicationRate',
    name: '応募率',
    unit: '%',
    threshold: {
      dangerMax: 1,
      warningMin: 1.5,
      warningMax: 3,
      successMin: 3,
    },
    dangerAlert: '⚠️ 求人詳細（写真・文章）を改善してください',
    successAlert: '✨ 優秀です！この求人をベンチマークにしましょう',
    solution: '①求人詳細の写真を追加（5枚以上）②福利厚生欄を充実③職場の雰囲気がわかる文章に書き換え',
    higherIsBetter: true,
  },
  redirectRate: {
    id: 'redirectRate',
    name: '自社サイト誘導率',
    unit: '%',
    threshold: {
      dangerMax: 3,
      warningMin: 5,
      warningMax: 10,
      successMin: 10,
    },
    dangerAlert: '⚠️ 誘導文言・ボタンを改善してください',
    successAlert: '✨ 優秀です！誘導先コンテンツをさらに充実させましょう',
    solution: '①誘導文言を改善（「詳しくはこちら」→「職場見学も可能！詳細はこちら」など）②誘導ボタンの位置・デザインを変更',
    higherIsBetter: true,
  },
  fraudDetection: {
    id: 'fraudDetection',
    name: '閲覧率（不正検知）',
    unit: '%',
    threshold: {
      dangerMin: 30,
      warningMin: 0,
      warningMax: 30,
      successMin: 0,
    },
    dangerAlert: '🚨 不正アクセスの可能性。GUPPY運営に報告してください',
    successAlert: '',
    solution: '①GUPPY運営に報告②一時的に様子見（1週間）③改善なければ掲載停止検討',
    higherIsBetter: false,
  },
};

// GUPPY（スカウト経路）のKPI定義
export const GUPPY_SCOUT_KPIS: Record<string, KPIDefinition> = {
  weeklyScoutCount: {
    id: 'weeklyScoutCount',
    name: 'スカウト送信数（週）',
    unit: '通',
    threshold: {
      dangerMax: 10,
      warningMin: 20,
      warningMax: 30,
      successMin: 30,
    },
    dangerAlert: '⚠️ 送信を定期タスク化してください',
    successAlert: '✨ 送信量確保できています！文面の質も上げましょう',
    solution: '①スカウト送信の定期タスク化（毎週月曜10時など）②送信条件を緩和（通勤範囲を広げる）',
    higherIsBetter: true,
  },
  bitlyClickRate: {
    id: 'bitlyClickRate',
    name: 'Bitlyクリック率',
    unit: '%',
    threshold: {
      dangerMax: 10,
      warningMin: 15,
      warningMax: 25,
      successMin: 25,
    },
    dangerAlert: '⚠️ リンク前の訴求文を改善してください',
    successAlert: '✨ 優秀です！リンク先コンテンツもさらに充実させましょう',
    solution: '①リンク前の文章を改善（「詳細はこちら」→「職場の様子を動画で公開中」など）②リンク先コンテンツを充実（写真・動画）',
    higherIsBetter: true,
  },
  scoutReplyRate: {
    id: 'scoutReplyRate',
    name: 'スカウト返信率',
    unit: '%',
    threshold: {
      dangerMax: 3,
      warningMin: 5,
      warningMax: 10,
      successMin: 10,
    },
    dangerAlert: '⚠️ スカウト文面をパーソナライズしてください',
    successAlert: '✨ 優秀です！返信後の対応速度も上げましょう',
    solution: '①スカウト文面をパーソナライズ②返信後の対応速度も上げる',
    higherIsBetter: true,
  },
};

// ジョブメドレー（閲覧経路）のKPI定義
export const JOBMEDLEY_VIEW_KPIS: Record<string, KPIDefinition> = {
  searchRank: {
    id: 'searchRank',
    name: '検索順位',
    unit: '位',
    threshold: {
      dangerMin: 20,
      warningMin: 5,
      warningMax: 15,
      successMin: 0,
    },
    dangerAlert: '⚠️ 【最優先】特徴タグ・定期更新・スピード返信・写真充実を実施してください',
    successAlert: '✨ 上位表示できています！この状態を維持しましょう',
    solution: '①求人の「特徴」を漏れなくチェック②定期更新（月1回以上）③スピード返信④写真を充実（最低4枚）⑤「職員の声」「職場の環境」を登録',
    higherIsBetter: false,  // 順位は低い方が良い
  },
  pageApplicationRate: {
    id: 'pageApplicationRate',
    name: '求人ページ応募率',
    unit: '%',
    threshold: {
      dangerMax: 0.8,
      warningMin: 1,
      warningMax: 2,
      successMin: 2,
    },
    dangerAlert: '⚠️ 写真・職員の声・職場環境を充実させてください',
    successAlert: '✨ 優秀です！この求人をベンチマークにしましょう',
    solution: '①写真を充実（1枚目は横1200px×縦675px以上）②「職員の声」「職場の環境」を登録③勤務イメージがわかる説明文に変更',
    higherIsBetter: true,
  },
};

// ジョブメドレー（スカウト経路）のKPI定義
export const JOBMEDLEY_SCOUT_KPIS: Record<string, KPIDefinition> = {
  monthlyScoutCount: {
    id: 'monthlyScoutCount',
    name: 'スカウト送信数（月）',
    unit: '通',
    threshold: {
      dangerMax: 150,
      warningMin: 180,
      warningMax: 200,
      successMin: 200,
    },
    dangerAlert: '⚠️ 無料枠を使い切りましょう（月200通目標）',
    successAlert: '✨ 無料枠を最大活用できています！',
    solution: '①無料枠を使い切るまで送信（月200通目標）②定期タスク化（毎週50通など）',
    higherIsBetter: true,
  },
  scoutApplicationRate: {
    id: 'scoutApplicationRate',
    name: 'スカウト応募率',
    unit: '%',
    threshold: {
      dangerMax: 2,
      warningMin: 3,
      warningMax: 5,
      successMin: 5,
    },
    dangerAlert: '⚠️ 1文目・文面全体・送信対象を見直してください',
    successAlert: '✨ 優秀です！この文面をテンプレート化しましょう',
    solution: '①1文目を改善（名前呼びかけ＋具体的な評価ポイント）②スカウト文面全体を見直し③送信対象を絞り込む',
    higherIsBetter: true,
  },
};

// クオキャリアのKPI定義
export const QUACAREER_KPIS: Record<string, KPIDefinition> = {
  weeklyScoutCount: {
    id: 'weeklyScoutCount',
    name: 'スカウト送信数（週）',
    unit: '通',
    threshold: {
      dangerMax: 5,
      warningMin: 10,
      warningMax: 20,
      successMin: 20,
    },
    dangerAlert: '⚠️ 定期タスク化してください（週2回推奨）',
    successAlert: '✨ 送信量確保できています！',
    solution: '①定期タスク化（毎週月曜・木曜など）②送信フローをマニュアル化',
    higherIsBetter: true,
  },
  openRate: {
    id: 'openRate',
    name: '開封率',
    unit: '%',
    threshold: {
      dangerMax: 40,
      warningMin: 50,
      warningMax: 70,
      successMin: 70,
    },
    dangerAlert: '⚠️ 件名・送信時間帯を改善してください',
    successAlert: '✨ 優秀です！開封後の文面もさらに改善しましょう',
    solution: '①件名を変更（「スカウト」→「◯◯さんへ｜△△クリニックから」）②送信時間帯を変更（平日19時以降推奨）③スカウトプラス機能を使う',
    higherIsBetter: true,
  },
  applicationConversionRate: {
    id: 'applicationConversionRate',
    name: '応募転換率',
    unit: '%',
    threshold: {
      dangerMax: 1,
      warningMin: 2,
      warningMax: 4,
      successMin: 4,
    },
    dangerAlert: '⚠️ 文言・送り先を見直してください',
    successAlert: '✨ 優秀です！この文面をベンチマークにしましょう',
    solution: '①文言を見直し（1文目＋全体の訴求ポイント）②送り先を見直し（条件マッチ度を上げる）③職場の魅力を具体的に記載',
    higherIsBetter: true,
  },
};

// 全媒体統合KPI
export const INTEGRATED_KPIS: Record<string, KPIDefinition> = {
  monthlyTotalApplications: {
    id: 'monthlyTotalApplications',
    name: '月間総応募数',
    unit: '名',
    threshold: {
      dangerMax: 5,
      warningMin: 8,
      warningMax: 12,
      successMin: 12,
    },
    dangerAlert: '⚠️ 全媒体で改善施策を同時実行してください',
    successAlert: '✨ 応募が集まっています！選考フローの質も上げましょう',
    solution: '①全媒体の応募数を増やす施策を同時実行②新規媒体の追加を検討③条件（給与・勤務時間）の見直し',
    higherIsBetter: true,
  },
  goalProgressRate: {
    id: 'goalProgressRate',
    name: '目標採用進捗率',
    unit: '%',
    threshold: {
      dangerMax: 50,  // 残6ヶ月で50%未満は危険
      warningMin: 50,
      warningMax: 100,
      successMin: 100,
    },
    dangerAlert: '🚨 施策の大幅見直しが必要です（条件・媒体追加検討）',
    successAlert: '✨ 順調です！このペースを維持しましょう',
    solution: '①全媒体の応募数を増やす施策を同時実行②新規媒体の追加を検討③条件（給与・勤務時間）の見直し',
    higherIsBetter: true,
  },
};

// ============================================
// アラート判定関数
// ============================================

export interface KPIAlert {
  kpiId: string;
  kpiName: string;
  value: number;
  unit: string;
  level: AlertLevel;
  message: string;
  solution: string;
  source: 'guppy' | 'jobmedley' | 'quacareer' | 'integrated';
  category: 'view' | 'scout' | 'integrated';
}

/**
 * 値からアラートレベルを判定
 */
export function getAlertLevel(value: number, definition: KPIDefinition): AlertLevel {
  const { threshold, higherIsBetter } = definition;

  // 不正検知（閲覧率30%超）
  if (threshold.dangerMin !== undefined && value >= threshold.dangerMin) {
    return 'danger';
  }

  // 警告閾値（低すぎる）
  if (threshold.dangerMax !== undefined && value <= threshold.dangerMax) {
    return 'danger';
  }

  // 優良閾値
  if (higherIsBetter) {
    if (value >= threshold.successMin) {
      return 'success';
    }
  } else {
    // 順位など、低い方が良い場合
    if (value <= threshold.successMin || value < threshold.warningMin) {
      return 'success';
    }
  }

  // 目標KPI範囲内
  if (value >= threshold.warningMin && value <= threshold.warningMax) {
    return 'warning';
  }

  return 'neutral';
}

/**
 * アラートメッセージを取得
 */
export function getAlertMessage(level: AlertLevel, definition: KPIDefinition): string {
  switch (level) {
    case 'danger':
      return definition.dangerAlert;
    case 'success':
      return definition.successAlert;
    default:
      return '';
  }
}

/**
 * KPI値からアラートを生成
 */
export function createKPIAlert(
  value: number,
  definition: KPIDefinition,
  source: KPIAlert['source'],
  category: KPIAlert['category']
): KPIAlert {
  const level = getAlertLevel(value, definition);
  const message = getAlertMessage(level, definition);

  return {
    kpiId: definition.id,
    kpiName: definition.name,
    value,
    unit: definition.unit,
    level,
    message,
    solution: definition.solution,
    source,
    category,
  };
}

// ============================================
// 計算ヘルパー関数
// ============================================

/**
 * 閲覧率を計算（閲覧数 / 表示数）
 */
export function calculateViewRate(viewCount: number, displayCount: number): number {
  if (displayCount === 0) return 0;
  return (viewCount / displayCount) * 100;
}

/**
 * 応募率を計算（応募数 / 閲覧数）
 */
export function calculateApplicationRate(applicationCount: number, viewCount: number): number {
  if (viewCount === 0) return 0;
  return (applicationCount / viewCount) * 100;
}

/**
 * 誘導率を計算（誘導数 / 閲覧数）
 */
export function calculateRedirectRate(redirectCount: number, viewCount: number): number {
  if (viewCount === 0) return 0;
  return (redirectCount / viewCount) * 100;
}

/**
 * 返信率を計算（返信数 / 送信数）
 */
export function calculateReplyRate(replyCount: number, sentCount: number): number {
  if (sentCount === 0) return 0;
  return (replyCount / sentCount) * 100;
}

/**
 * Bitlyクリック率を計算（クリック数 / 送信数）
 */
export function calculateBitlyClickRate(clickCount: number, sentCount: number): number {
  if (sentCount === 0) return 0;
  return (clickCount / sentCount) * 100;
}

// ============================================
// 色取得関数
// ============================================

/**
 * アラートレベルに対応する色を取得（Tailwind CSS用）
 */
export function getAlertColor(level: AlertLevel): {
  bg: string;
  text: string;
  border: string;
  bgLight: string;
} {
  switch (level) {
    case 'danger':
      return {
        bg: 'bg-red-500',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-500',
        bgLight: 'bg-red-50 dark:bg-red-900/20',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-500',
        text: 'text-yellow-700 dark:text-yellow-400',
        border: 'border-yellow-500',
        bgLight: 'bg-yellow-50 dark:bg-yellow-900/20',
      };
    case 'success':
      return {
        bg: 'bg-green-500',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-500',
        bgLight: 'bg-green-50 dark:bg-green-900/20',
      };
    default:
      return {
        bg: 'bg-gray-400',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-400',
        bgLight: 'bg-gray-50 dark:bg-gray-800',
      };
  }
}

/**
 * 数値セル用の背景色クラスを取得
 */
export function getCellColorClass(level: AlertLevel): string {
  switch (level) {
    case 'danger':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    case 'warning':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'success':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    default:
      return '';
  }
}

// ============================================
// 施策対応表
// ============================================

export interface Solution {
  problem: string;
  solutions: string[];
  note?: string;
}

export const GUPPY_VIEW_SOLUTIONS: Solution[] = [
  {
    problem: '表示数が少ない（前月比-20%以上）',
    solutions: [
      '求人を更新する（最終更新日を新しくする）',
      '返信スピードを上げる（24時間以内返信）',
      'プロフィール欄を充実させる',
      'GUPPY独立応援資金を設定する',
    ],
    note: '更新頻度と返信速度が表示アルゴリズムに影響',
  },
  {
    problem: '閲覧率が低い（<5%）',
    solutions: [
      '求人タイトルを変更（具体的な給与・勤務地を明記）',
      'メイン写真を変更（明るく、魅力的なものに）',
    ],
    note: 'タイトルと写真でクリックされるかが決まる',
  },
  {
    problem: '閲覧率が異常に高い（>30%）',
    solutions: [
      'GUPPY運営に報告',
      '一時的に様子見（1週間）',
      '改善なければ掲載停止検討',
    ],
    note: '不正アクセスの可能性、コスト増大リスク',
  },
  {
    problem: '応募率が低い（<1%）',
    solutions: [
      '求人詳細の写真を追加（5枚以上）',
      '福利厚生欄を充実',
      '職場の雰囲気がわかる文章に書き換え',
    ],
    note: '詳細を見ても魅力が伝わっていない',
  },
  {
    problem: '自社サイト誘導率が低い（<3%）',
    solutions: [
      '誘導文言を改善（「詳しくはこちら」→「職場見学も可能！詳細はこちら」など）',
      '誘導ボタンの位置・デザインを変更',
    ],
    note: '誘導の文言が行動を促せていない',
  },
];

export const GUPPY_SCOUT_SOLUTIONS: Solution[] = [
  {
    problem: '送信数が少ない（週<10通）',
    solutions: [
      'スカウト送信の定期タスク化（毎週月曜10時など）',
      '送信条件を緩和（通勤範囲を広げる）',
    ],
    note: 'そもそも運用が回っていない',
  },
  {
    problem: 'Bitlyクリック率が低い（<10%）',
    solutions: [
      'リンク前の文章を改善（「詳細はこちら」→「職場の様子を動画で公開中」など）',
      'リンク先コンテンツを充実（写真・動画）',
      'リンクの訴求を強化（「◯◯な職場です。ぜひご覧ください→」）',
    ],
    note: '返信率より重要な指標',
  },
  {
    problem: '返信があってもBitlyクリックがない',
    solutions: [
      '返信内でのリンク訴求を強化',
      'リンク前の文章を見直し',
      '魅力的なリンク先コンテンツに改善',
    ],
    note: '返信後の導線が弱い',
  },
];

export const JOBMEDLEY_VIEW_SOLUTIONS: Solution[] = [
  {
    problem: '検索順位が低い（>20位 or 圏外）',
    solutions: [
      '【最重要】求人の「特徴」を漏れなくチェック（該当するものは全て）',
      '定期更新（月1回以上、写真更新＋訴求文見直し）',
      'スピード返信（24時間以内）で「スピード返信」アイコンを表示',
      '写真を充実（最低4枚：外観/内観/スタッフ/設備）',
      '「職員の声」「職場の環境」を登録',
      '給与情報を充実（詳細に記載）',
      'タイトルを見直し',
    ],
    note: '特徴タグ未設定は検索結果に乗らない可能性あり',
  },
  {
    problem: '求人ページ応募率が低い（<0.8%）',
    solutions: [
      '写真を充実（1枚目は横1200px×縦675px以上、明るく魅力的に）',
      '「職員の声」「職場の環境」を登録',
      '勤務イメージがわかる説明文に変更',
      '「1日の流れ」などを追記',
    ],
    note: '写真の質と職場情報の充実度が重要',
  },
  {
    problem: '「スピード返信」アイコンがない',
    solutions: [
      '応募後24時間以内の返信を徹底',
      '返信テンプレートを用意して即対応できる体制を作る',
    ],
    note: '特集ページ掲載＋信頼性アップ',
  },
];

export const JOBMEDLEY_SCOUT_SOLUTIONS: Solution[] = [
  {
    problem: '送信数が少ない（月<150通）',
    solutions: [
      '無料枠を使い切るまで送信（月200通目標）',
      '定期タスク化（毎週50通など）',
    ],
    note: '無料なので積極的に送るべき',
  },
  {
    problem: 'スカウト応募率が低い（<2%）',
    solutions: [
      '1文目を改善（名前呼びかけ＋具体的な評価ポイント）',
      'スカウト文面全体を見直し（定型文から脱却）',
      '送信対象を絞り込む（経験年数・希望条件マッチ）',
    ],
    note: '1文目で開封されるかが決まる',
  },
];

export const QUACAREER_SOLUTIONS: Solution[] = [
  {
    problem: '送信数が少ない（週<5通）',
    solutions: [
      '定期タスク化（毎週月曜・木曜など）',
      '送信フローをマニュアル化',
    ],
    note: '運用が習慣化していない',
  },
  {
    problem: '開封率が低い（<40%）',
    solutions: [
      '件名を変更（「スカウト」→「◯◯さんへ｜△△クリニックから」）',
      '送信時間帯を変更（平日19時以降推奨）',
      'スカウトプラス機能を使う',
    ],
    note: '件名で開封されていない',
  },
  {
    problem: '開封されても応募がない',
    solutions: [
      '文言を見直し（1文目＋全体の訴求ポイント）',
      '送り先を見直し（条件マッチ度を上げる）',
      '職場の魅力を具体的に記載',
      '見学・カジュアル面談を提案',
    ],
    note: '文言と送り先が最重要',
  },
];
