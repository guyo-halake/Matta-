import { InlineKeyboard } from 'grammy';

export function getSystemHealthKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔄 Refresh Stats', 'action_refresh_health')
    .text('🧹 Free Memory', 'action_free_ram')
    .row()
    .text('🖥️ View Processes', 'action_view_processes');
}

export function getPomodoroKeyboard(sessionRunning: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (sessionRunning) {
    kb.text('⏸️ Pause', 'pomo_pause')
      .text('⏹️ Stop / Clear', 'pomo_clear')
      .text('⏳ Check Time Left', 'pomo_status');
  } else {
    kb.text('▶️ Start 25m Focus', 'pomo_start_25')
      .text('☕ Take 5m Break', 'pomo_start_break');
  }
  return kb;
}

export function getActionApprovalKeyboard(actionId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Approve & Execute', `approve_${actionId}`)
    .text('❌ Deny', `deny_${actionId}`);
}
