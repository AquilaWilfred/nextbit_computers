// hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

export function useWebSocket(userId: number | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});
  const intentionalClose = useRef(false);

  const connect = useCallback(() => {
    if (!userId) return;

    const token = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('nextbit_ws_token='))
      ?.split('=')[1];

    if (!token) {
      console.log('WebSocket: no ws token found');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // localhost:3000
    const wsUrl = `${protocol}//${host}/api/technician/ws/${userId}`;

    console.log('WebSocket connecting to:', wsUrl);  // ← add this
    console.log('userId:', userId);                   // ← add this

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        intentionalClose.current = false;
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(data);

          switch (data.event) {
            case 'quote_received':
              toast.success(data.data.message, {
                duration: 5000,
                action: {
                  label: 'View Quote',
                  onClick: () => { window.location.href = '/repairs?tab=requests'; }
                }
              });
              break;
            case 'status_update':
              toast.info(data.data.message);
              break;
            case 'new_message':
              toast.info(`New message: ${data.data.message}`);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (!intentionalClose.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, 5000);
        }
        intentionalClose.current = false;
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [userId]);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (userId) {
      const timer = setTimeout(() => {
        if (mounted) connect();
      }, 0);
      return () => {
        mounted = false;
        clearTimeout(timer);
        disconnect();
      };
    }

    return () => {
      mounted = false;
      disconnect();
    };
  }, [userId]); // ← userId only

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { isConnected, lastMessage, sendMessage, disconnect };
}