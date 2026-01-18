import type { Source } from '@/types';

interface ValidationResult {
  valid: boolean;
  source?: Source | null;
  error?: string;
}

const VALID_SOURCES: Source[] = ['guppy', 'jobmedley', 'quacareer'];

/**
 * source クエリパラメータをバリデーションする
 *
 * @param value - クエリパラメータの値
 * @returns バリデーション結果
 *
 * @example
 * validateSourceParameter('guppy') // { valid: true, source: 'guppy' }
 * validateSourceParameter(null) // { valid: true, source: null }
 * validateSourceParameter('invalid') // { valid: false, error: '...' }
 */
export function validateSourceParameter(
  value: string | null | undefined
): ValidationResult {
  // パラメータが省略された場合（null または undefined）
  if (value === null || value === undefined) {
    return { valid: true, source: null };
  }

  // 空文字の場合は無効
  if (value === '') {
    return {
      valid: false,
      error: 'Invalid source parameter. Valid values: guppy, jobmedley, quacareer',
    };
  }

  // 有効な source 値かチェック
  if (VALID_SOURCES.includes(value as Source)) {
    return { valid: true, source: value as Source };
  }

  // 無効な値の場合
  return {
    valid: false,
    error: 'Invalid source parameter. Valid values: guppy, jobmedley, quacareer',
  };
}
