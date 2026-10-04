import axios from 'axios';

export async function searchWebDuckDuckGo(query: string): Promise<string> {
  try {
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });

    const html = response.data as string;
    const matches = Array.from(html.matchAll(/<a class="result__url" href="([^"]+)".*?>\s*(.*?)\s*<\/a>/g));

    if (matches.length === 0) {
      return `Web Search query "${query}" executed. No direct URLs retrieved.`;
    }

    const results = matches.slice(0, 5).map((m, idx) => {
      const link = m[1];
      const title = m[2].replace(/<[^>]+>/g, '');
      return `${idx + 1}. [${title}](${link})`;
    });

    return `🌐 Web Search Results for "${query}":\n${results.join('\n')}`;
  } catch (err: any) {
    return `Web search error: ${err.message}`;
  }
}
