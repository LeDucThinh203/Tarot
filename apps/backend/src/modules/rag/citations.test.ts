import { verifiedCitations } from './citation-formatter.js';

describe('citation validation', () => {
  const retrieved = [{ id: 'c10b60bd-04c5-4992-bc20-0cb80e7f73c1', content: 'Nội dung thật đã truy xuất.', title: 'Nền tảng Tarot', source: 'file:foundations.md', metadata: {}, similarity: 0.82 }];
  it('formats citations using backend-owned ids and source metadata', () => {
    expect(verifiedCitations(retrieved, [{ chunkId: retrieved[0]!.id, title: 'title do model gửi' }])).toEqual([{ chunkId: retrieved[0]!.id, title: 'Nền tảng Tarot', source: 'file:foundations.md', excerpt: 'Nội dung thật đã truy xuất.', similarity: 0.82 }]);
  });
  it('drops a citation id that was not returned by retrieval', () => {
    expect(verifiedCitations(retrieved, [{ chunkId: 'c10b60bd-04c5-4992-bc20-0cb80e7f73c2', title: 'nguồn bịa' }])).toEqual([]);
  });
});
