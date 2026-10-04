import axios from 'axios';
import { config } from '../config/index.js';

export type LLMRoute = 'fast' | 'complex' | 'local';

export interface LLMRouteDecision {
  selectedRoute: LLMRoute;
  modelName: string;
  reason: string;
}

export function routeLLMTask(prompt: string, requestedRoute?: string): LLMRouteDecision {
  if (requestedRoute === 'local' || prompt.toLowerCase().includes('offline')) {
    return {
      selectedRoute: 'local',
      modelName: 'ollama/llama3',
      reason: 'User requested local offline execution.',
    };
  }

  if (
    prompt.length > 1500 ||
    prompt.toLowerCase().includes('refactor entire') ||
    prompt.toLowerCase().includes('architectural design')
  ) {
    return {
      selectedRoute: 'complex',
      modelName: 'gpt-4o-mini / gemini-1.5-pro',
      reason: 'High complexity codebase refactor/architecture task.',
    };
  }

  return {
    selectedRoute: 'fast',
    modelName: config.geminiModel || 'gemini-2.5-flash',
    reason: 'Standard speed-optimized LLM routing.',
  };
}

export async function queryLocalOllama(prompt: string, model = 'llama3'): Promise<string> {
  try {
    const res = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model,
        prompt,
        stream: false,
      },
      { timeout: 10000 }
    );
    return res.data?.response || 'Ollama completed response.';
  } catch (err: any) {
    return `Local Ollama unavailable on http://localhost:11434 (Error: ${err.message}). Defaulting to online Gemini/OpenAI engine.`;
  }
}
