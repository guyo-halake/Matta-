import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import {
  getUnifiedSchedule,
  getTodayClasses,
  createCalendarEvent,
  editCalendarEvent,
  deleteCalendarEvent,
} from '../services/calendar.js';
import { getWeather } from '../services/weather.js';
import { saveUserFact } from '../agent/memory.js';
import { getDb, saveDb } from '../db/database.js';
import {
  executeWindowsCommand,
  readRemoteFile,
  writeRemoteFile,
  getWindowsSystemHealth,
  launchWindowsApp,
  executeGithubCommand,
  executeVercelCommand,
} from './windowsControl.js';

export const geminiTools: FunctionDeclaration[] = [
  {
    name: 'execute_windows_command',
    description: 'Execute a PowerShell or CMD terminal command on the host Windows machine (for vibe coding, diagnostics, running scripts, git commands).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: { type: SchemaType.STRING, description: 'PowerShell/CMD command line string to execute' },
        cwd: { type: SchemaType.STRING, description: 'Optional directory path to execute the command in' },
      },
      required: ['command'],
    },
  },
  {
    name: 'launch_windows_app',
    description: 'Launch an application on Razak\'s Windows PC (e.g. code, chrome, blender, spotify, wt, cmd).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        appName: { type: SchemaType.STRING, description: 'Application executable or protocol name (e.g., code, chrome, blender, spotify)' },
      },
      required: ['appName'],
    },
  },
  {
    name: 'execute_github_command',
    description: 'Execute GitHub CLI or repository commands (e.g., repo list, issue list, pr status, commit checks).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subcommand: { type: SchemaType.STRING, description: 'GitHub CLI subcommand string (e.g., repo list, status, issue list)' },
      },
      required: ['subcommand'],
    },
  },
  {
    name: 'execute_vercel_command',
    description: 'Execute Vercel CLI commands to check deployment status, project builds, and logs.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        subcommand: { type: SchemaType.STRING, description: 'Vercel subcommand string (e.g., ls, inspect, logs)' },
      },
      required: ['subcommand'],
    },
  },
  {
    name: 'read_remote_file',
    description: 'Read the text or code content of a file on the Windows machine.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: { type: SchemaType.STRING, description: 'Relative or absolute filepath to read' },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'write_remote_file',
    description: 'Write, edit, or create a code/text file on the Windows machine.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: { type: SchemaType.STRING, description: 'Relative or absolute filepath to write' },
        content: { type: SchemaType.STRING, description: 'Code/text content to save in the file' },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'get_windows_system_health',
    description: 'Get CPU usage, RAM stats, Disk space, and Windows OS health status.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_today_classes',
    description: 'Get today\'s academic classes and scheduled events.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_calendar_schedule',
    description: 'Fetch upcoming calendar events, classes, and meetings from iCloud iCal, Google Calendar, and Local Schedule.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        daysAhead: { type: SchemaType.NUMBER, description: 'Number of days ahead to search (default 7)' },
      },
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Schedule a new event, class, or meeting on Google Calendar and local schedule.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: 'Title of the event or class' },
        startTimeIso: { type: SchemaType.STRING, description: 'Start time ISO format (e.g. 2026-09-21T10:00:00Z)' },
        endTimeIso: { type: SchemaType.STRING, description: 'End time ISO format (e.g. 2026-09-21T11:00:00Z)' },
        description: { type: SchemaType.STRING, description: 'Optional details or notes' },
        location: { type: SchemaType.STRING, description: 'Optional location' },
      },
      required: ['summary', 'startTimeIso', 'endTimeIso'],
    },
  },
  {
    name: 'edit_calendar_event',
    description: 'Edit or update an existing event or class in your schedule.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        idOrSummary: { type: SchemaType.STRING, description: 'Event ID or matching title string' },
        summary: { type: SchemaType.STRING, description: 'New title' },
        startTimeIso: { type: SchemaType.STRING, description: 'New start time ISO format' },
        endTimeIso: { type: SchemaType.STRING, description: 'New end time ISO format' },
        description: { type: SchemaType.STRING, description: 'New description' },
        location: { type: SchemaType.STRING, description: 'New location' },
      },
      required: ['idOrSummary'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete an event or class from your schedule by ID or title.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        idOrSummary: { type: SchemaType.STRING, description: 'Event ID or matching title string to delete' },
      },
      required: ['idOrSummary'],
    },
  },
  {
    name: 'get_weather_forecast',
    description: 'Get live weather conditions for any city.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        city: { type: SchemaType.STRING, description: 'Name of the city (e.g., London, Nairobi, New York)' },
      },
      required: ['city'],
    },
  },
  {
    name: 'save_personal_fact',
    description: 'Save user preferences, class schedule details, or habit facts into persistent memory.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        key: { type: SchemaType.STRING, description: 'Fact category (e.g., class_schedule, favorite_ide, timezone)' },
        value: { type: SchemaType.STRING, description: 'Fact details' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'start_pomodoro_session',
    description: 'Start a Pomodoro focus timer session.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        taskName: { type: SchemaType.STRING, description: 'Task or subject name' },
        durationMinutes: { type: SchemaType.NUMBER, description: 'Focus duration in minutes (default 25)' },
      },
      required: ['taskName'],
    },
  },
];

export const agentTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'execute_windows_command',
      description: 'Execute a PowerShell or CMD terminal command on the host Windows machine.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'PowerShell/CMD command line string' },
          cwd: { type: 'string', description: 'Optional directory path' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_windows_app',
      description: 'Launch an application on Razak\'s Windows PC.',
      parameters: {
        type: 'object',
        properties: {
          appName: { type: 'string', description: 'Application executable name (code, chrome, blender, spotify)' },
        },
        required: ['appName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_github_command',
      description: 'Execute GitHub CLI commands.',
      parameters: {
        type: 'object',
        properties: {
          subcommand: { type: 'string', description: 'GitHub CLI subcommand' },
        },
        required: ['subcommand'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_vercel_command',
      description: 'Execute Vercel CLI commands.',
      parameters: {
        type: 'object',
        properties: {
          subcommand: { type: 'string', description: 'Vercel subcommand' },
        },
        required: ['subcommand'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_remote_file',
      description: 'Read the text or code content of a file.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative or absolute filepath' },
        },
        required: ['filePath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_remote_file',
      description: 'Write, edit, or create a code/text file.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Relative or absolute filepath' },
          content: { type: 'string', description: 'Code/text content' },
        },
        required: ['filePath', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_windows_system_health',
      description: 'Get CPU usage, RAM stats, Disk space.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_today_classes',
      description: 'Get today\'s academic classes and scheduled events.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar_schedule',
      description: 'Fetch upcoming calendar events.',
      parameters: {
        type: 'object',
        properties: {
          daysAhead: { type: 'number', description: 'Days ahead to fetch' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create an event on calendar and local schedule.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Event title' },
          startTimeIso: { type: 'string', description: 'Start time ISO string' },
          endTimeIso: { type: 'string', description: 'End time ISO string' },
          description: { type: 'string', description: 'Optional description' },
          location: { type: 'string', description: 'Optional location' },
        },
        required: ['summary', 'startTimeIso', 'endTimeIso'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_calendar_event',
      description: 'Edit an existing event in your schedule.',
      parameters: {
        type: 'object',
        properties: {
          idOrSummary: { type: 'string', description: 'Event ID or title string' },
          summary: { type: 'string', description: 'New title' },
          startTimeIso: { type: 'string', description: 'New start time ISO' },
          endTimeIso: { type: 'string', description: 'New end time ISO' },
          description: { type: 'string', description: 'New description' },
          location: { type: 'string', description: 'New location' },
        },
        required: ['idOrSummary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_calendar_event',
      description: 'Delete an event from your schedule.',
      parameters: {
        type: 'object',
        properties: {
          idOrSummary: { type: 'string', description: 'Event ID or title string' },
        },
        required: ['idOrSummary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather_forecast',
      description: 'Get live weather conditions for any city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Name of the city' },
        },
        required: ['city'],
      },
    },
  },
];

export async function executeToolCall(
  chatId: string | number,
  toolName: string,
  args: any
): Promise<string> {
  switch (toolName) {
    case 'execute_windows_command': {
      const res = await executeWindowsCommand(args.command, args.cwd);
      return `Command: ${args.command}\nExitCode: ${res.exitCode}\nStdout: ${res.stdout}\nStderr: ${res.stderr}`;
    }

    case 'launch_windows_app': {
      return await launchWindowsApp(args.appName);
    }

    case 'execute_github_command': {
      return await executeGithubCommand(args.subcommand);
    }

    case 'execute_vercel_command': {
      return await executeVercelCommand(args.subcommand);
    }

    case 'read_remote_file': {
      return await readRemoteFile(args.filePath);
    }

    case 'write_remote_file': {
      return await writeRemoteFile(args.filePath, args.content);
    }

    case 'get_windows_system_health': {
      return await getWindowsSystemHealth();
    }

    case 'get_today_classes': {
      const classes = await getTodayClasses();
      if (classes.length === 0) return 'No classes or events scheduled for today.';
      return JSON.stringify(classes, null, 2);
    }

    case 'get_calendar_schedule': {
      const daysAhead = args.daysAhead || 7;
      const now = new Date();
      const endWindow = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const events = await getUnifiedSchedule(now, endWindow);
      if (events.length === 0) return `No upcoming calendar events found for the next ${daysAhead} days.`;
      return JSON.stringify(events, null, 2);
    }

    case 'create_calendar_event': {
      const res = await createCalendarEvent(
        args.summary,
        args.startTimeIso,
        args.endTimeIso,
        args.description,
        args.location
      );
      return res.message;
    }

    case 'edit_calendar_event': {
      const res = await editCalendarEvent(args.idOrSummary, {
        summary: args.summary,
        startTimeIso: args.startTimeIso,
        endTimeIso: args.endTimeIso,
        description: args.description,
        location: args.location,
      });
      return res.message;
    }

    case 'delete_calendar_event': {
      const res = await deleteCalendarEvent(args.idOrSummary);
      return res.message;
    }

    case 'get_weather_forecast': {
      return await getWeather(args.city);
    }

    case 'save_personal_fact': {
      saveUserFact(chatId, args.key, args.value);
      return `Saved to persistent memory: ${args.key} = ${args.value}`;
    }

    case 'start_pomodoro_session': {
      const db = getDb();
      const session = {
        id: db.pomodoroSessions.length + 1,
        chatId: String(chatId),
        taskName: args.taskName,
        duration: args.durationMinutes || 25,
        breakDuration: 5,
        status: 'running',
        startedAt: new Date().toISOString(),
      };
      db.pomodoroSessions.push(session);
      saveDb();
      return `Pomodoro focus session "${args.taskName}" initiated for ${args.durationMinutes || 25} minutes.`;
    }

    default:
      return `Tool ${toolName} not found.`;
  }
}
