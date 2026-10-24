import { knowledgeDirectory, loadKnowledgeFiles } from './document-loader.js';

describe('knowledge document loading', () => {
  it('loads the curated guide and all 78 seeded card meanings with source metadata', async () => {
    const documents = await loadKnowledgeFiles();
    expect(knowledgeDirectory.replaceAll('\\', '/')).toContain('/knowledge/tarot');
    expect(documents).toHaveLength(79);
    expect(documents.filter((document) => document.source.startsWith('catalog:'))).toHaveLength(78);
    expect(documents.some((document) => document.source === 'file:foundations.md')).toBe(true);
    expect(documents.find((document) => document.source === 'catalog:the-star')?.content).toContain('Ý nghĩa lá ngược');
  });
});
