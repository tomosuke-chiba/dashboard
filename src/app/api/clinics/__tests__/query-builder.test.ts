import { applySourceFilter } from '../query-builder';
import type { Source } from '@/types';

describe('applySourceFilter', () => {
  describe('source フィルタの適用', () => {
    it('source が指定された場合、.eq("source", source) を含むクエリを返す', () => {
      // モックのクエリビルダー
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };

      const result = applySourceFilter(mockQuery as any, 'guppy' as Source);

      expect(mockQuery.eq).toHaveBeenCalledWith('source', 'guppy');
      expect(result).toBe(mockQuery);
    });

    it('source が null の場合、フィルタを適用せずクエリをそのまま返す', () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };

      const result = applySourceFilter(mockQuery as any, null);

      expect(mockQuery.eq).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('source が jobmedley の場合、.eq("source", "jobmedley") を含むクエリを返す', () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };

      const result = applySourceFilter(mockQuery as any, 'jobmedley' as Source);

      expect(mockQuery.eq).toHaveBeenCalledWith('source', 'jobmedley');
      expect(result).toBe(mockQuery);
    });

    it('source が quacareer の場合、.eq("source", "quacareer") を含むクエリを返す', () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
      };

      const result = applySourceFilter(mockQuery as any, 'quacareer' as Source);

      expect(mockQuery.eq).toHaveBeenCalledWith('source', 'quacareer');
      expect(result).toBe(mockQuery);
    });
  });

  describe('チェーンメソッドとの組み合わせ', () => {
    it('既存のクエリチェーンに source フィルタを追加できる', () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };

      // 既存のチェーン: .from().select().eq('clinic_id', '123')
      mockQuery.from('metrics');
      mockQuery.select('*');
      mockQuery.eq('clinic_id', '123');

      // source フィルタを適用
      const result = applySourceFilter(mockQuery as any, 'guppy' as Source);

      expect(mockQuery.eq).toHaveBeenCalledWith('clinic_id', '123');
      expect(mockQuery.eq).toHaveBeenCalledWith('source', 'guppy');
      expect(result).toBe(mockQuery);
    });
  });
});
