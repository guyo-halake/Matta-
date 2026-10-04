import fs from 'fs';
import path from 'path';

export interface VectorDoc {
  id: string;
  category: string;
  content: string;
  tags: string[];
  createdAt: string;
}

const vectorStoragePath = path.resolve(process.cwd(), 'temp', 'vector_memory.json');

export function saveVectorMemory(category: string, content: string, tags: string[] = []): string {
  const dir = path.dirname(vectorStoragePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let docs: VectorDoc[] = [];
  if (fs.existsSync(vectorStoragePath)) {
    try {
      docs = JSON.parse(fs.readFileSync(vectorStoragePath, 'utf-8'));
    } catch (e) {}
  }

  const doc: VectorDoc = {
    id: `vec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    category,
    content,
    tags,
    createdAt: new Date().toISOString(),
  };

  docs.push(doc);
  fs.writeFileSync(vectorStoragePath, JSON.stringify(docs, null, 2), 'utf-8');

  return `Saved to RAG Vector Memory under [${category}]: "${content.slice(0, 50)}..."`;
}

export function searchVectorMemory(query: string): VectorDoc[] {
  if (!fs.existsSync(vectorStoragePath)) return [];
  try {
    const docs: VectorDoc[] = JSON.parse(fs.readFileSync(vectorStoragePath, 'utf-8'));
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return docs.filter((doc) => {
      const text = `${doc.category} ${doc.content} ${doc.tags.join(' ')}`.toLowerCase();
      return terms.some((term) => text.includes(term));
    });
  } catch (e) {
    return [];
  }
}
