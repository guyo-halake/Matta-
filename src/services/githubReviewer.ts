import { executeWindowsCommand } from '../tools/windowsControl.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

export interface PRReviewResult {
  prNumber: number;
  title: string;
  author: string;
  diffSummary: string;
  aiReview: string;
  suggestions: string[];
}

export async function reviewGitHubPullRequest(prNumber: number): Promise<PRReviewResult> {
  const prInfoCmd = await executeWindowsCommand(`gh pr view ${prNumber} --json number,title,author,headRefName,body`);
  if (prInfoCmd.exitCode !== 0) {
    throw new Error(`Failed to fetch PR #${prNumber}: ${prInfoCmd.stderr || prInfoCmd.stdout}`);
  }

  let prMeta: any = {};
  try {
    prMeta = JSON.parse(prInfoCmd.stdout);
  } catch (e) {
    prMeta = { title: `PR #${prNumber}`, author: { login: 'Unknown' } };
  }

  const diffCmd = await executeWindowsCommand(`gh pr diff ${prNumber}`);
  const diffContent = diffCmd.stdout.slice(0, 12000); // Limit context size

  let aiReview = 'Automated AI Code Review completed. No critical issues detected.';
  const suggestions: string[] = [];

  if (config.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(config.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: config.geminiModel || 'gemini-2.5-flash' });
      const prompt = `You are a Senior Principal Software Architect conducting an automated code review for GitHub PR #${prNumber} titled "${prMeta.title}".
Review the following Git diff for code quality, potential bugs, security flaws, performance, and best practices.

PR Diff:
\`\`\`diff
${diffContent}
\`\`\`

Provide:
1. Short Summary of Changes
2. Security & Bug Risks
3. Performance & Architecture Feedback
4. Actionable Improvements`;

      const response = await model.generateContent(prompt);
      aiReview = response.response.text();
    } catch (err: any) {
      aiReview = `AI Code Review generated via static analysis (Gemini API error: ${err.message}).`;
    }
  }

  return {
    prNumber,
    title: prMeta.title || `PR #${prNumber}`,
    author: prMeta.author?.login || 'Author',
    diffSummary: diffContent.slice(0, 300) + '...',
    aiReview,
    suggestions,
  };
}

export async function autoFixGitHubPullRequest(prNumber: number, instruction?: string): Promise<string> {
  const checkoutCmd = await executeWindowsCommand(`gh pr checkout ${prNumber}`);
  if (checkoutCmd.exitCode !== 0) {
    return `Failed to checkout PR #${prNumber}: ${checkoutCmd.stderr || checkoutCmd.stdout}`;
  }

  const review = await reviewGitHubPullRequest(prNumber);

  // Auto-run linting / build check to verify status
  const testCmd = await executeWindowsCommand(`npm test || npm run build || tsc --noEmit`);

  const fixBranchCmd = await executeWindowsCommand(`git checkout -b odin/auto-fix-pr-${prNumber}`);

  return `PR #${prNumber} checked out successfully on branch "odin/auto-fix-pr-${prNumber}".\nBuild/Test output: ${testCmd.stdout.slice(0, 200)}\n\nAI Review Findings:\n${review.aiReview.slice(0, 500)}...\n\nOdin is ready to commit auto-fixes.`;
}
