import fs from 'fs';
import path from 'path';

let cachedPrompt: string | null = null;

export function getSystemPrompt(userFacts: Record<string, string>): string {
  if (!cachedPrompt) {
    const promptPath = path.resolve(process.cwd(), 'prompts', 'astra.md');
    if (fs.existsSync(promptPath)) {
      cachedPrompt = fs.readFileSync(promptPath, 'utf-8');
    } else {
      cachedPrompt = `You are Astra, the personal AI assistant for Guyo Razak Halake (Razak).`;
    }
  }

  const factsStr = Object.keys(userFacts).length > 0
    ? '\n\n### Additional Dynamic Memory Facts:\n' + Object.entries(userFacts).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : '';

  return cachedPrompt + factsStr;
}
