import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getActiveWorkspace } from './workspace.js';

export async function downloadFileFromUrl(url: string, customFilename?: string): Promise<string> {
  try {
    const filename = customFilename || path.basename(new URL(url).pathname) || `download_${Date.now()}.bin`;
    const targetPath = path.join(getActiveWorkspace(), filename);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000,
    });

    const writer = fs.createWriteStream(targetPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`✅ Successfully downloaded file from ${url} to: ${targetPath}`));
      writer.on('error', (err) => reject(`Error saving download: ${err.message}`));
    });
  } catch (err: any) {
    return `Download error: ${err.message}`;
  }
}
