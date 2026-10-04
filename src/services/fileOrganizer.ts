import fs from 'fs';
import path from 'path';

export interface OrganizeReport {
  movedFilesCount: number;
  categories: Record<string, number>;
  message: string;
}

export function organizeFolder(targetFolderPath?: string): OrganizeReport {
  const folder = targetFolderPath || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'Downloads');

  if (!fs.existsSync(folder)) {
    return { movedFilesCount: 0, categories: {}, message: `Folder does not exist: ${folder}` };
  }

  const extensionMap: Record<string, string> = {
    '.pdf': 'Documents',
    '.docx': 'Documents',
    '.xlsx': 'Documents',
    '.txt': 'Documents',
    '.png': 'Images',
    '.jpg': 'Images',
    '.jpeg': 'Images',
    '.svg': 'Images',
    '.mp4': 'Videos',
    '.mkv': 'Videos',
    '.mp3': 'Audio',
    '.wav': 'Audio',
    '.zip': 'Archives',
    '.rar': 'Archives',
    '.exe': 'Installers',
    '.msi': 'Installers',
  };

  const categoriesCount: Record<string, number> = {};
  let movedCount = 0;

  try {
    const items = fs.readdirSync(folder, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        const category = extensionMap[ext];
        if (category) {
          const catDir = path.join(folder, category);
          if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

          const srcPath = path.join(folder, item.name);
          const destPath = path.join(catDir, item.name);
          fs.renameSync(srcPath, destPath);

          categoriesCount[category] = (categoriesCount[category] || 0) + 1;
          movedCount++;
        }
      }
    }
  } catch (err: any) {
    return { movedFilesCount: movedCount, categories: categoriesCount, message: `Error organizing folder: ${err.message}` };
  }

  return {
    movedFilesCount: movedCount,
    categories: categoriesCount,
    message: `Organized ${movedCount} files in ${folder} cleanly across categories.`,
  };
}
