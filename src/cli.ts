import { processUserMessage } from './agent/brain.js';
import { initDatabase } from './db/database.js';
import dotenv from 'dotenv';
dotenv.config();

initDatabase();

const question = process.argv.slice(2).join(' ');

if (!question) {
  console.log('👉 Usage: npx tsx src/cli.ts "Your question here"');
  process.exit(0);
}

async function runCli() {
  console.log(`\n❓ [ASKING ASTRA]: "${question}"`);
  console.log('--------------------------------------------------');
  const response = await processUserMessage('CLI_OWNER', question);
  console.log(`🤖 [ASTRA RESPONSE]:\n${response}\n`);
}

runCli();
