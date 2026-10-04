import { executeWindowsCommand } from '../tools/windowsControl.js';

export async function openBrowserUrl(url: string, browser = 'chrome'): Promise<string> {
  try {
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    const psCommand = `Start-Process '${browser}' '${validUrl}'`;
    const res = await executeWindowsCommand(psCommand);
    if (res.exitCode === 0) {
      return `🌐 Opened URL in ${browser}: ${validUrl}`;
    }
    // Fallback default browser
    await executeWindowsCommand(`Start-Process '${validUrl}'`);
    return `🌐 Opened URL in default browser: ${validUrl}`;
  } catch (err: any) {
    return `Browser open error: ${err.message}`;
  }
}
