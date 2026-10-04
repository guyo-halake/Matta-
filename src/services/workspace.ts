import fs from 'fs';
import path from 'path';

let activeWorkspacePath: string = process.cwd();

export function getActiveWorkspace(): string {
  return activeWorkspacePath;
}

export function setActiveWorkspace(targetPath: string): { success: boolean; path: string; message: string } {
  try {
    const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, path: activeWorkspacePath, message: `Directory does not exist: ${resolvedPath}` };
    }
    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return { success: false, path: activeWorkspacePath, message: `Path is not a directory: ${resolvedPath}` };
    }
    activeWorkspacePath = resolvedPath;
    return { success: true, path: activeWorkspacePath, message: `Active workspace switched to: ${activeWorkspacePath}` };
  } catch (err: any) {
    return { success: false, path: activeWorkspacePath, message: `Failed to set workspace: ${err.message}` };
  }
}

export interface WorkspaceInfo {
  name: string;
  path: string;
  isGitRepo: boolean;
  activeBranch?: string;
  isCurrent: boolean;
}

export function listAvailableWorkspaces(): WorkspaceInfo[] {
  const current = getActiveWorkspace();
  const parentDir = path.dirname(current);
  const candidates: string[] = [current, parentDir];

  const results: Map<string, WorkspaceInfo> = new Map();

  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          const fullPath = path.join(dir, item.name);
          const isGitRepo = fs.existsSync(path.join(fullPath, '.git'));
          results.set(fullPath, {
            name: item.name,
            path: fullPath,
            isGitRepo,
            isCurrent: fullPath === current,
          });
        }
      }
    } catch (e) {}
  }

  return Array.from(results.values());
}

export function getWorkspaceTree(maxDepth = 2, targetDir?: string): string {
  const root = targetDir || getActiveWorkspace();
  if (!fs.existsSync(root)) return `Workspace directory not found: ${root}`;

  function buildTree(currentPath: string, currentDepth: number): string {
    if (currentDepth > maxDepth) return '';
    let output = '';
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      const filtered = items.filter(
        (i) => !['node_modules', '.git', 'dist', '.next', 'temp', 'coverage'].includes(i.name)
      );

      for (let idx = 0; idx < filtered.length; idx++) {
        const item = filtered[idx];
        const indent = '  '.repeat(currentDepth);
        const prefix = idx === filtered.length - 1 ? '└── ' : '├── ';
        output += `${indent}${prefix}${item.name}${item.isDirectory() ? '/' : ''}\n`;

        if (item.isDirectory() && currentDepth < maxDepth) {
          output += buildTree(path.join(currentPath, item.name), currentDepth + 1);
        }
      }
    } catch (err: any) {
      output += `[Error reading directory: ${err.message}]\n`;
    }
    return output;
  }

  return `📁 Workspace Root: ${root}\n${buildTree(root, 0)}`;
}
