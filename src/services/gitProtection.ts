import { executeWindowsCommand } from '../tools/windowsControl.js';

export interface ProtectionResult {
  stashCreated: boolean;
  stashName: string;
  backupBranch?: string;
  message: string;
}

export async function createSafetyStash(reason = 'odin-auto-save'): Promise<ProtectionResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const stashName = `odin-backup-${timestamp}`;

  try {
    const statusCmd = await executeWindowsCommand('git status --porcelain');
    if (!statusCmd.stdout.trim()) {
      return {
        stashCreated: false,
        stashName,
        message: 'Git working directory is clean. No uncommitted changes to stash.',
      };
    }

    const stashCmd = await executeWindowsCommand(`git stash push -m "${stashName}"`);
    if (stashCmd.exitCode === 0) {
      return {
        stashCreated: true,
        stashName,
        message: `Created git safety stash "${stashName}" successfully.`,
      };
    }

    // Fallback: create backup branch
    const branchName = `odin/backup-${timestamp}`;
    await executeWindowsCommand(`git checkout -b ${branchName}`);
    await executeWindowsCommand(`git add -A && git commit -m "Auto-save before AI edit: ${reason}"`);
    await executeWindowsCommand(`git checkout -`);

    return {
      stashCreated: false,
      stashName,
      backupBranch: branchName,
      message: `Created safety backup branch "${branchName}".`,
    };
  } catch (err: any) {
    return {
      stashCreated: false,
      stashName,
      message: `Safety stash warning: ${err.message}`,
    };
  }
}
