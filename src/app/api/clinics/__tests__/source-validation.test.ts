import { validateSourceParameter } from '../source-validation';
import type { Source } from '@/types';

describe('validateSourceParameter', () => {
  describe('有効な source 値', () => {
    it('source=guppy の場合、guppy を返す', () => {
      const result = validateSourceParameter('guppy');
      expect(result).toEqual({ valid: true, source: 'guppy' as Source });
    });

    it('source=jobmedley の場合、jobmedley を返す', () => {
      const result = validateSourceParameter('jobmedley');
      expect(result).toEqual({ valid: true, source: 'jobmedley' as Source });
    });

    it('source=quacareer の場合、quacareer を返す', () => {
      const result = validateSourceParameter('quacareer');
      expect(result).toEqual({ valid: true, source: 'quacareer' as Source });
    });

    it('source が null の場合（パラメータなし）、valid=true で source=null を返す', () => {
      const result = validateSourceParameter(null);
      expect(result).toEqual({ valid: true, source: null });
    });

    it('source が undefined の場合（パラメータなし）、valid=true で source=null を返す', () => {
      const result = validateSourceParameter(undefined);
      expect(result).toEqual({ valid: true, source: null });
    });
  });

  describe('無効な source 値', () => {
    it('source=invalid の場合、valid=false でエラーメッセージを返す', () => {
      const result = validateSourceParameter('invalid');
      expect(result).toEqual({
        valid: false,
        error: 'Invalid source parameter. Valid values: guppy, jobmedley, quacareer',
      });
    });

    it('source=GUPPY（大文字）の場合、valid=false でエラーメッセージを返す', () => {
      const result = validateSourceParameter('GUPPY');
      expect(result).toEqual({
        valid: false,
        error: 'Invalid source parameter. Valid values: guppy, jobmedley, quacareer',
      });
    });

    it('source=空文字の場合、valid=false でエラーメッセージを返す', () => {
      const result = validateSourceParameter('');
      expect(result).toEqual({
        valid: false,
        error: 'Invalid source parameter. Valid values: guppy, jobmedley, quacareer',
      });
    });
  });
});
