import type { Source } from '@/types';

/**
 * Supabase クエリビルダーに source フィルタを適用する
 *
 * @param query - Supabase クエリビルダー
 * @param source - フィルタする媒体（null の場合はフィルタなし）
 * @returns source フィルタが適用されたクエリビルダー
 *
 * @example
 * let query = supabase.from('metrics').select('*');
 * query = applySourceFilter(query, 'guppy'); // .eq('source', 'guppy') が追加される
 */
export function applySourceFilter<T>(query: T, source: Source | null): T {
  if (source === null) {
    return query;
  }

  // Supabase クエリビルダーは .eq() メソッドを持つ
  const queryWithEq = query as any;
  return queryWithEq.eq('source', source);
}
