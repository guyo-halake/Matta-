import { executeWindowsCommand, ExecutionResult } from '../tools/windowsControl.js';

export async function executeInDockerSandbox(command: string, imageName = 'node:20-alpine'): Promise<ExecutionResult> {
  // Check if docker is installed
  const dockerCheck = await executeWindowsCommand('docker --version');
  if (dockerCheck.exitCode !== 0) {
    return {
      stdout: '',
      stderr: 'Docker is not running on this host system. Falling back to native execution guard.',
      exitCode: 1,
    };
  }

  const escapedCmd = command.replace(/"/g, '\\"');
  const dockerCmd = `docker run --rm -v "${process.cwd()}:/app" -w /app ${imageName} sh -c "${escapedCmd}"`;
  return await executeWindowsCommand(dockerCmd);
}
