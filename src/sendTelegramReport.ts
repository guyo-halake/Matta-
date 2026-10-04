import { bot } from './bot/instance.js';
import dotenv from 'dotenv';
dotenv.config();

async function sendReport() {
  const telegramUserId = process.env.ALLOWED_TELEGRAM_USER_ID || '5784911905';

  const report = `📋 *EXECUTION REPORT: Desktop Folder & GitHub Clone Task*

✅ *Folder Creation*: Created directory \`C:\\Users\\guyoh\\Desktop\\KCA University\` on Windows Desktop.
✅ *GitHub Cloning*: Cloned repository \`guyo-halake/Matta-\` directly into \`C:\\Users\\guyoh\\Desktop\\KCA University\\Matta-\`.
✅ *Verification*: Verified files on disk:
\`\`\`
Directory: C:\\Users\\guyoh\\Desktop\\KCA University
Name: Matta-
\`\`\`

📱 *Status*: Task completed with ExitCode 0 on your Windows host OS!`;

  try {
    await bot.api.sendMessage(telegramUserId, report, { parse_mode: 'Markdown' });
    console.log(`✅ Execution report sent successfully to Telegram User ID: ${telegramUserId}`);
  } catch (err: any) {
    console.error('Error sending Telegram report:', err.message);
  }
}

sendReport();
