import cron from 'node-cron';
import { getDb, saveDb } from '../db/database.js';
import { executeWindowsCommand } from '../tools/windowsControl.js';

export interface CustomCronItem {
  id: string;
  name: string;
  cronExpression: string;
  command: string;
  enabled: boolean;
  createdAt: string;
}

const activeTasks: Map<string, cron.ScheduledTask> = new Map();

export function initCustomCronScheduler() {
  const db = getDb();
  if (!db.customCrons) {
    db.customCrons = [];
    saveDb();
  }

  for (const item of db.customCrons) {
    if (item.enabled && cron.validate(item.cronExpression)) {
      scheduleTask(item);
    }
  }
}

function scheduleTask(item: CustomCronItem) {
  if (activeTasks.has(item.id)) {
    activeTasks.get(item.id)?.stop();
  }

  const task = cron.schedule(item.cronExpression, async () => {
    console.log(`⏰ [Custom Cron Triggered]: ${item.name} (${item.command})`);
    try {
      await executeWindowsCommand(item.command);
    } catch (e: any) {
      console.error(`❌ Custom cron task error (${item.name}):`, e.message);
    }
  });

  activeTasks.set(item.id, task);
}

export function createCustomCronTask(name: string, cronExpression: string, command: string): string {
  if (!cron.validate(cronExpression)) {
    return `Error: Invalid cron expression "${cronExpression}". Standard 5-field format required (e.g. "*/30 * * * *").`;
  }

  const db = getDb();
  if (!db.customCrons) db.customCrons = [];

  const newItem: CustomCronItem = {
    id: `cron_${Date.now()}`,
    name,
    cronExpression,
    command,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  db.customCrons.push(newItem);
  saveDb();
  scheduleTask(newItem);

  return `Successfully scheduled task "${name}" with expression "${cronExpression}". Task ID: ${newItem.id}`;
}

export function listCustomCronTasks(): string {
  const db = getDb();
  const tasks = db.customCrons || [];
  if (tasks.length === 0) return 'No custom scheduled cron tasks registered.';
  return JSON.stringify(tasks, null, 2);
}
