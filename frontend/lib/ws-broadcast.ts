// import { announcements } from '@/app/api/ws/route'; // only if using Next.js WS route
// OR just keep as admin-side broadcast via REST for now:

export async function broadcastSettingUpdate(key: string, value: unknown): Promise<void> {
  await fetch('/api/settings/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
}