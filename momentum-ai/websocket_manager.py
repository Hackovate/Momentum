# websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            self.active[user_id].remove(websocket)

    async def send_json(self, user_id: str, data):
        conns = self.active.get(user_id, [])
        for ws in conns:
            try:
                await ws.send_json(data)
            except:
                pass

# Global instance
ws_manager = ConnectionManager()

