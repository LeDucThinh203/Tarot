import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText, documentMetadata } from './text-processing.js';
import { tarotCards } from '../tarot-cards/cards-data.js';

export type LoadedDocument = { title: string; source: string; content: string; checksum: string; metadata: ReturnType<typeof documentMetadata> };
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
export const knowledgeDirectory = join(workspaceRoot, 'knowledge', 'tarot');

export async function loadKnowledgeFiles(directory = knowledgeDirectory): Promise<LoadedDocument[]> {
  const files = await collectMarkdown(directory);
  const documents: LoadedDocument[] = [];
  for (const path of files) {
    const content = cleanText(await readFile(path, 'utf8'));
    if (!content) continue;
    const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.split(/[\\/]/).at(-1)!.replace(/\.md$/i, '');
    const source = `file:${relative(directory, path).replaceAll('\\', '/')}`;
    documents.push({ title, source, content, checksum: createHash('sha256').update(content).digest('hex'), metadata: documentMetadata(source, content) });
  }
  for (const card of tarotCards) {
    const content = cleanText([
      `# ${card.nameVi} — ${card.name}`,
      `Bộ Ẩn: ${card.arcana === 'MAJOR' ? 'Ẩn Chính' : `Ẩn Phụ · ${card.suit ?? ''}`}.`,
      card.description,
      `Ý nghĩa lá xuôi: ${card.uprightMeaning}`,
      `Ý nghĩa lá ngược: ${card.reversedMeaning}`,
      `Từ khóa: ${card.keywords.join(', ')}.`,
    ].join('\n\n'));
    const source = `catalog:${card.slug}`;
    documents.push({ title: card.nameVi, source, content, checksum: createHash('sha256').update(content).digest('hex'), metadata: { ...documentMetadata(source, content), cardName: card.nameVi, documentType: 'tarot-card' } });
  }
  return documents;
}

async function collectMarkdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await collectMarkdown(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') paths.push(path);
  }
  return paths.sort();
}
