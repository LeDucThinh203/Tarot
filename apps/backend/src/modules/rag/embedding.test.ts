import { AppError } from '../../common/errors.js';
import { assertEmbeddingDimension } from './embedding.service.js';

describe('embedding vector contract', () => {
  it('accepts vectors that match the configured dimension', () => {
    expect(() => assertEmbeddingDimension([0.1, 0.2, 0.3], 3)).not.toThrow();
  });
  it('rejects a changed or non-finite embedding dimension', () => {
    expect(() => assertEmbeddingDimension([0.1, 0.2], 3)).toThrowError(AppError);
    expect(() => assertEmbeddingDimension([0.1, Number.NaN, 0.3], 3)).toThrowError(AppError);
  });
});
