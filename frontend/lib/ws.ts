const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://127.0.0.1:8001';

type MessageHandler = (data: string) => void;

export function createAnnouncementSocket(onMessage: MessageHandler): () => void {
  // Don't connect during SSR
  if (typeof window === 'undefined') return () => {};

  const ws = new WebSocket(`${WS_BASE}/api/ws/announcements`);

  ws.onopen    = () => console.log('[WS] announcements connected');
  ws.onmessage = (e) => onMessage(e.data);
  ws.onerror   = (e) => console.error('[WS] error', e);
  ws.onclose   = () => console.log('[WS] announcements closed');

  // Returns cleanup function
  return () => ws.close();
}