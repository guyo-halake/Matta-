import { getDb, saveDb } from '../db/database.js';

export function saveMessage(chatId: string | number, role: 'user' | 'assistant' | 'system', content: string) {
  const db = getDb();
  db.conversationLogs.push({
    id: db.conversationLogs.length + 1,
    chatId: String(chatId),
    role,
    content,
    timestamp: new Date().toISOString(),
  });
  // Keep logs under 100 per chat
  if (db.conversationLogs.length > 500) {
    db.conversationLogs = db.conversationLogs.slice(-500);
  }
  saveDb();
}

export function getRecentHistory(chatId: string | number, limit: number = 10): { role: string; content: string }[] {
  const db = getDb();
  const filtered = db.conversationLogs
    .filter((log) => log.chatId === String(chatId))
    .slice(-limit);
  
  return filtered.map((f) => ({ role: f.role, content: f.content }));
}

export function saveUserFact(chatId: string | number, key: string, value: string) {
  const db = getDb();
  const cid = String(chatId);
  if (!db.memory[cid]) {
    db.memory[cid] = {};
  }
  db.memory[cid][key] = value;
  saveDb();
}

export function getUserFacts(chatId: string | number): Record<string, string> {
  const db = getDb();
  return db.memory[String(chatId)] || {};
}
