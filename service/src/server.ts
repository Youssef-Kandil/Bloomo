import http from 'node:http';

import { createApp } from './app';
import { env } from './config/env';
import { startAttendanceScheduler } from './features/attendance/attendance.scheduler';
import { initSockets } from './sockets';

async function main(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);
  startAttendanceScheduler();

  server.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.info(`🌱 bloomo-service listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
