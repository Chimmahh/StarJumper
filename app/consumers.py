
from channels.generic.websocket import AsyncJsonWebsocketConsumer, JsonWebsocketConsumer
from .utils import get_game_or_error
from django.core.cache import cache
from .exceptions import ClientError
from django.conf import settings
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from .models import GamePlayer

CACHE_TTL = getattr(settings, 'CACHE_TTL', DEFAULT_TIMEOUT)

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
        elif command == "place":
            await self.place_group(content)
        elif command == "reconcile":
            await self.reconcile_group(content)
        elif command == "reconcile_host":
            await self.reconcile_host_group(content)
        elif command == "shot":
            await self.shot_group(content)


    # async def disconnect(self, code):
    #     print(code)
    #     for game_id in self.game.copy():
    #         await self.leave_game({"game": game_id})

    async def join_game(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        self.game.add(content["game"])
        await self.channel_layer.group_add(
            game.group_name,
            self.channel_name,
        )
        new_game_player = GamePlayer(game=game, player=self.scope["user"])
        new_game_player.save()
        players_in_game = GamePlayer.objects.filter(game_id=content["game"]).count()
        if players_in_game == 1:
            await self.send_json(
                {
                    "type": "host",
                }
            )
        cache.set(game.group_name + "." + self.scope["user"].username + ".client_now", 0, timeout=CACHE_TTL)

    async def leave_game(self, content):
        # print(content)
        # print(self.scope["user"])
        game = await get_game_or_error(content["game"], self.scope["user"])
        self.game.discard(content["game"])
        await self.channel_layer.group_discard(
            game.group_name,
            self.channel_name,
        )
        await self.send_json(
            {
                "type": "leave"
            }
        )

    async def keyup_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "keyup.client",
                "username": self.scope["user"].username,
                "key": content["key"],
            }
        )

    async def keyup_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "keyup",
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
                "username": self.scope["user"].username,
                "key": content["key"],
            }
        )

    async def keydown_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "keydown",
                    "username": event["username"],
                    "key": event["key"],
                }
            )

    async def place_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "place.client",
                "username": self.scope["user"].username,
                "placement": content["placement"],
            }
        )

    async def place_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "place",
                    "username": event["username"],
                    "placement": event["placement"],
                }
            )

    async def reconcile_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        if cache.get(game.group_name + "." + self.scope["user"].username + ".client_now") < content["client_now"]:
            await self.channel_layer.group_send(
                game.group_name,
                {
                    "type": "reconcile.client",
                    "username": self.scope["user"].username,
                    "current": content["current"],
                }
            )
            cache.set(game.group_name + "." + self.scope["user"].username + ".client_now", content["client_now"], timeout=CACHE_TTL)

    async def reconcile_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "reconcile",
                    "username": event["username"],
                    "current": event["current"],
                }
            )

    async def reconcile_host_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "reconcile_host.client",
                "username": self.scope["user"].username,
                "portals": content["portals"],
                "stars": content["stars"],
                "health": content["health"],
            }
        )

    async def reconcile_host_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "reconcile_host",
                    "host_update": {
                        "portals": event["portals"],
                        "stars": event["stars"],
                        "health": event["health"],
                    }
                }
            )

    async def shot_group(self, content):
        game = await get_game_or_error(content["game"], self.scope["user"])
        await self.channel_layer.group_send(
            game.group_name,
            {
                "type": "shot.client",
                "username": self.scope["user"].username,
                "client_now": content["client_now"],
                "shot": content["shot"],
            }
        )

    async def shot_client(self, event):
        if event["username"] != self.scope["user"].username:
            await self.send_json(
                {
                    "type": "shot",
                    "username": event["username"],
                    "shot": event["shot"],
                }
            )
