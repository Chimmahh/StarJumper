from channels.db import database_sync_to_async
from .exceptions import ClientError
from .models import Game

@database_sync_to_async
def get_game_or_error(game_id, user):
    if not user.is_authenticated:
        raise ClientError("USER_HAS_TO_LOGIN")
    try:
        game = Game.objects.get(pk=game_id)
    except Game.DoesNotExist:
        raise ClientError("GAME_INVALID")
    return game