
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from .utils import get_game_or_error
from .exceptions import ClientError
import json

class Player(AsyncJsonWebsocketConsumer):

    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
        else:
            await self.accept()
        self.game = set()

    async def receive_json(self, content):
        command = content.get("command", None)
        if command == "join":
            await self.join_game(content["game"])
        elif command == "leave":
            await self.leave_game(content["game"])
        elif command == "send":
            await self.send_data(content["px"], content["py"])

    async def disconnect(self, code):
        for game_id in list(self.game):
            await self.leave_game(game_id)

    async def join_game(self, game_id):
        game = await get_game_or_error(game_id, self.scope["user"])
        self.game.add(game_id)
        await self.channel_layer.group_add(
            game.group_name,
            self.channel_name,
        )
        await self.send_json(
            {
                "join": str(game.id),
                "name": game.name,
                'username': self.scope["user"].username,
            }
        )

    async def leave_game(self, game_id):
        game = await get_game_or_error(game_id, self.scope["user"])
        self.game.discard(game_id)
        await self.channel_layer.group_discard(
            game.group_name,
            self.channel_name,
        )
        await self.send_json(
            {
                "leave": str(game.id)
            }
        )

    async def send_data(self, px, py):
        game = await get_game_or_error(1, self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "receive.data",
                "game_id": str(1),
                "username": self.scope["user"].username,
                "px": str(px),
                "py": str(py),
            }
        )

    async def receive_data(self, event):
        # print(event)
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "game": event["game_id"],
                    "username": event["username"],
                    "px": event["px"],
                    "py": event["py"],
                }
            )

