from django.db import models
from datetime import datetime
from django.contrib.auth.models import User

class GameType(models.Model):
    name = models.CharField(max_length=20)

    def __str__(self):
        return self.name


class Game(models.Model):
    name = models.CharField(max_length=50)
    type = models.ForeignKey(GameType, on_delete=models.CASCADE)
    date = models.DateTimeField(default=datetime.now())

    def __str__(self):
        return self.name

    @property
    def group_name(self):
        return "game-%s" % self.id


class GamePlayer(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.IntegerField()

    def __str__(self):
        return str(self.game) + " - " + str(self.player)
