import http from 'http';
import { checkSystemWatchdog } from './systemWatchdog.js';
import { getActiveWorkspace } from './workspace.js';
import { getDb } from '../db/database.js';

export function startWebAdminServer(port = 3050) {
  const server = http.createServer((req, res) => {
    if (req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const db = getDb();
      const status = {
        botName: 'OdinBot / Astra AI',
        version: '2.0.0',
        activeWorkspace: getActiveWorkspace(),
        systemHealth: checkSystemWatchdog(),
        activeSessions: db.pomodoroSessions?.length || 0,
        memoryFactsCount: db.userFacts?.length || 0,
        customCronsCount: db.customCrons?.length || 0,
      };
      res.end(JSON.stringify(status, null, 2));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>OdinBot Master Admin Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #334155; }
    h1 { color: #38bdf8; }
    .badge { background: #0284c7; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>🤖 OdinBot (Astra AI) Remote Dashboard</h1>
  <div class="card">
    <h3>System Telemetry</h3>
    <p>Active Workspace: <code>${getActiveWorkspace()}</code></p>
    <p>Status: <span class="badge">ONLINE</span></p>
  </div>
</body>
</html>
    `);
  });

  server.listen(port, () => {
    console.log(`🌐 Web Admin Dashboard live on http://localhost:${port}`);
  });

  return server;
}
