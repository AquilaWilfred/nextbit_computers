# ws/websocket_manager.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
import asyncio
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Real-time WebSocket manager for live updates."""
    
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self._lock = asyncio.Lock()
    
    async def connect(self, user_id: int, websocket: WebSocket):
        """Connect a user to WebSocket."""
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            logger.info(f"User {user_id} connected. Total users: {len(self.active_connections)}")
    
    def disconnect(self, user_id: int, websocket: WebSocket):
        """Disconnect a user."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected")
    
    async def send_to_user(self, user_id: int, event_type: str, data: dict):
        """Send event to specific user."""
        if user_id not in self.active_connections:
            logger.debug(f"No active connection for user {user_id}")
            return
        
        message = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        disconnected = []
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
                logger.debug(f"Sent {event_type} to user {user_id}")
            except Exception as e:
                logger.error(f"Failed to send to user {user_id}: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected sockets
        for conn in disconnected:
            self.disconnect(user_id, conn)

# Global instance
ws_manager = WebSocketManager()

router = APIRouter()

@router.websocket("/ws/{user_id}")
async def technician_websocket(websocket: WebSocket, user_id: int):
    await ws_manager.connect(user_id, websocket)
    try:
        await websocket.send_json({
            "event": "connected",
            "data": {"message": "Connected to real-time updates"},
            "timestamp": datetime.now().isoformat()
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({
                    "event": "pong",
                    "data": {},
                    "timestamp": datetime.now().isoformat()
                })
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        ws_manager.disconnect(user_id, websocket)