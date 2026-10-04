export function sanitizeSecrets(text: string): string {
  if (!text) return '';

  let clean = text;

  // Mask API Keys and Tokens (e.g. AIzaSy..., ghp_..., sk-...)
  clean = clean.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, 'AIzaSy********************');
  clean = clean.replace(/ghp_[A-Za-z0-9]{36}/g, 'ghp_********************');
  clean = clean.replace(/sk-[A-Za-z0-9]{32,}/g, 'sk-********************');
  clean = clean.replace(/VERCEL_TOKEN\s*=\s*[^\s\n]+/gi, 'VERCEL_TOKEN=********************');
  clean = clean.replace(/GH_TOKEN\s*=\s*[^\s\n]+/gi, 'GH_TOKEN=********************');
  clean = clean.replace(/-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END \1 PRIVATE KEY-----/g, '[PRIVATE KEY MASKED BY ODIN GOVERNANCE]');

  return clean;
}
