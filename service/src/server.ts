import http from 'node:http';
import os from 'node:os';

import { createApp } from './app';
import { env } from './config/env';
import { startAttendanceScheduler } from './features/attendance/attendance.scheduler';
import { initSockets } from './sockets';

/** Returns every non-internal IPv4 address bound on this machine, so the
 *  dev startup log lists every URL a phone on the same LAN can use. */
function listLanIps(): string[] {
  const out: string[] = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);
  startAttendanceScheduler();

  // Bind to 0.0.0.0 explicitly — Node's default of `::` (IPv6 dual-stack)
  // sometimes fails to accept IPv4 traffic on Windows, blocking LAN access
  // from phones even when the firewall is open.
  server.listen(env.PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.info(`🌱 bloomo-service listening on:`);
    // eslint-disable-next-line no-console
    console.info(`   • http://localhost:${env.PORT}`);
    for (const ip of listLanIps()) {
      // eslint-disable-next-line no-console
      console.info(`   • http://${ip}:${env.PORT}  (LAN)`);
    }
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
