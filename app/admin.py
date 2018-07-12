from django.contrib import admin
from .models import Game, GamePlayer, GameType


admin.site.register(Game)
admin.site.register(GameType)
admin.site.register(GamePlayer)