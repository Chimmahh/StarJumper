from django.db import models
from datetime import datetime
from django.contrib.auth.models import User
import json

class GameType(models.Model):
    name = models.CharField(max_length=20)

    def __str__(self):
        return self.name


class Game(models.Model):
    name = models.CharField(max_length=50)
    type = models.ForeignKey(GameType, on_delete=models.CASCADE)
    date = models.DateTimeField(default=datetime.now())

    OPEN = 'OP'
    IN_PROGRESS = 'IN'
    FINISHED = 'FI'

    state = models.CharField(
        max_length = 2,
        choices = (
            (OPEN, 'Open'),
            (IN_PROGRESS, 'In Progress'),
            (FINISHED, 'Finished')
        ),
        default = OPEN
    )

    def __str__(self):
        return self.name

    @property
    def group_name(self):
        return "game-%s" % self.id


class GamePlayer(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return str(self.game) + " - " + str(self.player)


class SinglePlayerScore(models.Model):
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateTimeField(default=datetime.now())
    level = models.IntegerField()
    score = models.IntegerField()

    def __str__(self):
        return str(self.player) + " got to level " + str(self.level) + ' and scored ' + str(self.score)

    def toDict(self):
        return {
            'player': self.player.username,
            'date': self.date.strftime("%Y-%m-%d"),
            'level': self.level,
            'score': self.score
        }