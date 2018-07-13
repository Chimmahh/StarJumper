
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
            await self.join_game(content)
        elif command == "leave":
            await self.leave_game(content)
        elif command == "keyup":
            await self.keyup_group(content)
        elif command == "keydown":
            await self.keydown_group(content)
        elif command == "reconcile":
            await self.reconcile_group(content)
        elif command == "shot":
            await self.shot_group(content)


    async def disconnect(self, code):
        for game_id in list(self.game):
            await self.leave_game(game_id)

    async def join_game(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        self.game.add(content["game"])
        await self.channel_layer.group_add(
            game.group_name,
            self.channel_name,
        )

    async def leave_game(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        self.game.discard(content["game"])
        await self.channel_layer.group_discard(
            game.group_name,
            self.channel_name,
        )
        await self.send_json(
            {
                "leave": str(game.id)
            }
        )

    async def keyup_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "keyup.client",
                "game_id": str(content["game"]),
                "username": self.scope["user"].username,
                "key": content["key"],
            }
        )

    async def keyup_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "keyup",
                    "game": event["game_id"],
                    "username": event["username"],
                    "key": event["key"],
                }
            )

    async def keydown_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "keydown.client",
                "game_id": str(content["game"]),
                "username": self.scope["user"].username,
                "key": content["key"],
            }
        )

    async def keydown_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "keydown",
                    "game": event["game_id"],
                    "username": event["username"],
                    "key": event["key"],
                }
            )

    async def reconcile_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "reconcile.client",
                "game_id": str(content["game"]),
                "username": self.scope["user"].username,
                "x": content["x"],
                "y": content["y"],
                "vy": content["vy"],
                "color": content["color"]
            }
        )

    async def reconcile_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "reconcile",
                    "game": event["game_id"],
                    "username": event["username"],
                    "x": event["x"],
                    "y": event["y"],
                    "vy": event["vy"],
                    "color": event["color"]
                }
            )

