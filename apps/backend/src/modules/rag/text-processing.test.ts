import { chunkText, cleanText, documentMetadata } from './text-processing.js';

describe('RAG text preparation', () => {
  it('normalizes whitespace and byte-order marks', () => {
    expect(cleanText('\uFEFFMột   đoạn\r\n\r\nvăn bản')).toBe('Một đoạn\n\nvăn bản');
  });

  it('splits long content into overlapping chunks without losing text', () => {
    const content = Array.from({ length: 28 }, (_, index) => `Đoạn văn số ${index + 1} nói về cách đọc biểu tượng Tarot.`).join('\n\n');
    const chunks = chunkText(content, 170, 28);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.length <= 172)).toBe(true);
    for (let index = 1; index < chunks.length; index += 1) {
      const sharedTail = chunks[index - 1]!.slice(-18).trim();
      expect(chunks[index]!.includes(sharedTail)).toBe(true);
    }
    expect(chunks.join(' ')).toContain('Đoạn văn số 28');
  });

  it('adds Vietnamese language and topic metadata', () => {
    expect(documentMetadata('file:love.md', '# Tình yêu và các lá bài\nCân nhắc cảm xúc và ranh giới.')).toMatchObject({ language: 'vi', topic: 'LOVE', documentType: 'tarot-card' });
  });
});
