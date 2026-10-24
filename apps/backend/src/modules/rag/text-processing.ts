export type KnowledgeMetadata = { source: string; language: string; topic: string; documentType: string; cardName: string | null };

export function cleanText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const normalized = cleanText(text);
  if (!normalized) return [];
  if (overlap < 0 || overlap >= chunkSize) throw new Error('Chunk overlap must be non-negative and smaller than chunk size.');
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf('\n\n', end), normalized.lastIndexOf('. ', end));
      if (boundary > start + Math.floor(chunkSize * 0.55)) end = boundary + (normalized[boundary] === '.' ? 1 : 2);
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

export function documentMetadata(source: string, content: string): KnowledgeMetadata {
  const titleLine = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const cardName = titleLine && !/foundation|nền tảng/i.test(titleLine) ? titleLine : null;
  return {
    source,
    language: /[ăâđêôơưĂÂĐÊÔƠƯ]/.test(content) ? 'vi' : 'en',
    topic: /love|tình yêu|relationship/i.test(content) ? 'LOVE' : /career|công việc/i.test(content) ? 'CAREER' : /finance|tài chính/i.test(content) ? 'FINANCE' : 'GENERAL',
    documentType: cardName ? 'tarot-card' : 'tarot-guide',
    cardName,
  };
}
