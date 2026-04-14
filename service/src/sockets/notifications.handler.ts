import type { Socket } from 'socket.io';

export function registerNotificationsHandler(socket: Socket): void {
  socket.on('ping', () => {
    socket.emit('pong');
  });
}
