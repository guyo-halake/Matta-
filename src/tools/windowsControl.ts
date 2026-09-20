import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute PowerShell or CMD command on host Windows machine
 */
export async function executeWindowsCommand(command: string, cwd?: string): Promise<ExecutionResult> {
  try {
    const targetCwd = cwd || process.cwd();
    const env = {
      ...process.env,
      GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
      VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
    };

    let psCommand = command;
    if (!command.toLowerCase().startsWith('powershell')) {
      psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '`"')}"`;
    }

    const { stdout, stderr } = await execAsync(psCommand, { cwd: targetCwd, env, timeout: 30000 });
    return {
      stdout: stdout.trim() || '[Command completed with no stdout]',
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout ? error.stdout.trim() : '',
      stderr: error.stderr ? error.stderr.trim() : error.message,
      exitCode: error.code || 1,
    };
  }
}

/**
 * Launch any Windows application (e.g., VS Code, Chrome, Blender, Spotify, Terminal)
 */
export async function launchWindowsApp(appName: string): Promise<string> {
  try {
    const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '${appName}'"`;
    await execAsync(psCommand);
    return `Successfully launched application: ${appName}`;
  } catch (err: any) {
    return `Could not launch app "${appName}": ${err.message}`;
  }
}

/**
 * Execute GitHub CLI (gh) / Git commands
 */
export async function executeGithubCommand(subcommand: string): Promise<string> {
  try {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    const cmd = `gh ${subcommand}`;
    const res = await executeWindowsCommand(cmd);
    if (res.exitCode !== 0 && res.stderr.includes('gh is not recognized')) {
      return `GitHub CLI (gh) is not installed on this Windows machine. You can run git commands using execute_windows_command instead.`;
    }
    if (res.stderr.includes('not logged into any GitHub hosts') && !token) {
      return `GitHub connection is not active yet. Please add GH_TOKEN=your_github_token to .env or run 'gh auth login' in your terminal.`;
    }
    return res.stdout || res.stderr;
  } catch (err: any) {
    return `GitHub command error: ${err.message}`;
  }
}

/**
 * Execute Vercel CLI commands
 */
export async function executeVercelCommand(subcommand: string): Promise<string> {
  try {
    const token = process.env.VERCEL_TOKEN;
    const cmd = token ? `npx vercel ${subcommand} --token ${token}` : `npx vercel ${subcommand}`;
    const res = await executeWindowsCommand(cmd);
    if (res.stderr.includes('No existing credentials') && !token) {
      return `Vercel connection is not active yet. Please add VERCEL_TOKEN=your_vercel_token to .env or run 'npx vercel login' in your terminal.`;
    }
    return res.stdout || res.stderr;
  } catch (err: any) {
    return `Vercel command error: ${err.message}`;
  }
}

/**
 * Read contents of any text/code file on Windows machine
 */
export async function readRemoteFile(filePath: string): Promise<string> {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
      return `Error: File does not exist at ${absolutePath}`;
    }
    const content = fs.readFileSync(absolutePath, 'utf-8');
    return content.length > 8000 ? content.slice(0, 8000) + '\n...[Truncated]' : content;
  } catch (err: any) {
    return `Error reading file: ${err.message}`;
  }
}

/**
 * Write or edit code file on Windows machine
 */
export async function writeRemoteFile(filePath: string, content: string): Promise<string> {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(absolutePath, content, 'utf-8');
    return `Successfully updated file: ${absolutePath}`;
  } catch (err: any) {
    return `Error writing file: ${err.message}`;
  }
}

/**
 * Get Windows Machine System Health (CPU, RAM, Disk, Uptime)
 */
export async function getWindowsSystemHealth(): Promise<string> {
  const psScript = `Get-CimInstance Win32_OperatingSystem | Select-Object Caption, TotalVisibleMemorySize, FreePhysicalMemory; Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object DeviceID, FreeSpace, Size`;
  const result = await executeWindowsCommand(psScript);
  return result.stdout;
}
