export interface AnkiCard {
  front: string;
  back: string;
  tags: string[];
}

export function generateAnkiDeckFromNotes(topic: string, rawNotesText: string): AnkiCard[] {
  const lines = rawNotesText.split('\n').filter((l) => l.trim().length > 0);
  const cards: AnkiCard[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes(':') || line.includes('-')) {
      const parts = line.split(/:(.*)|-(.*)/).filter(Boolean);
      if (parts.length >= 2) {
        cards.push({
          front: `[${topic}] What is ${parts[0].trim()}?`,
          back: parts[1].trim(),
          tags: ['kca', topic.toLowerCase().replace(/\s+/g, '-')],
        });
      }
    }
  }

  return cards;
}

export function formatAnkiCsv(cards: AnkiCard[]): string {
  return cards.map((c) => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}","${c.tags.join(' ')}"`).join('\n');
}
