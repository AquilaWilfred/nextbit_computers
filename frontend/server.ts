import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
import net from 'net';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  server.on('upgrade', (req: IncomingMessage, socket: net.Socket, head: Buffer) => {
    if (!req.url?.startsWith('/api/technician/ws')) return;

    const upstream = net.connect(8001, '127.0.0.1', () => {
      // Reconstruct upgrade request headers
      const headers = [
        `GET ${req.url} HTTP/1.1`,
        `Host: 127.0.0.1:8001`,
        ...Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`),
        '',
        '',
      ].join('\r\n');

      upstream.write(headers);

      // Forward any buffered bytes that came after the headers
      if (head && head.length) upstream.write(head);

      // Bidirectional pipe
      socket.pipe(upstream);
      upstream.pipe(socket);
    });

    upstream.on('error', (err) => {
      console.error('WS upstream error:', err.message);
      socket.destroy();
    });

    socket.on('error', (err) => {
      console.error('WS socket error:', err.message);
      upstream.destroy();
    });

    socket.on('close', () => upstream.destroy());
    upstream.on('close', () => socket.destroy());
  });

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});