import path from 'path';
import fs from 'fs';
import { executeWindowsCommand } from '../tools/windowsControl.js';

export async function captureDesktopScreenshot(): Promise<string> {
  const tempDir = path.resolve(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const screenshotPath = path.join(tempDir, `desktop_capture_${Date.now()}.png`);

  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bitmap.Size)

$bitmap.Save('${screenshotPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;

  const res = await executeWindowsCommand(psScript);
  if (fs.existsSync(screenshotPath)) {
    return screenshotPath;
  }
  return `Error capturing screenshot: ${res.stderr || res.stdout}`;
}
