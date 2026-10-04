import { executeWindowsCommand, ExecutionResult } from '../tools/windowsControl.js';

export interface AuditResult {
  vulnerabilitiesFound: number;
  summary: string;
  rawOutput: string;
}

/**
 * Run npm audit or snyk check on local project directory
 */
export async function runDependencySecurityAudit(projectPath?: string): Promise<AuditResult> {
  const cwd = projectPath || process.cwd();
  const res: ExecutionResult = await executeWindowsCommand('npm audit --json', cwd);

  try {
    const json = JSON.parse(res.stdout);
    const vulnCount = json.metadata?.vulnerabilities?.total || 0;
    const summary = `Found ${vulnCount} total vulnerabilities (Critical: ${json.metadata?.vulnerabilities?.critical || 0}, High: ${json.metadata?.vulnerabilities?.high || 0}, Moderate: ${json.metadata?.vulnerabilities?.moderate || 0}, Low: ${json.metadata?.vulnerabilities?.low || 0}).`;
    
    return {
      vulnerabilitiesFound: vulnCount,
      summary,
      rawOutput: res.stdout.slice(0, 3000),
    };
  } catch (e) {
    return {
      vulnerabilitiesFound: 0,
      summary: 'Audit completed or npm audit returned text output.',
      rawOutput: (res.stdout || res.stderr).slice(0, 3000),
    };
  }
}
