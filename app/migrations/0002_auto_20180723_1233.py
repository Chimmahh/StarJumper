# Generated by Django 2.0.6 on 2018-07-23 19:33

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='date',
            field=models.DateTimeField(default=datetime.datetime(2018, 7, 23, 12, 33, 4, 208048)),
        ),
        migrations.AlterField(
            model_name='singleplayerscore',
            name='date',
            field=models.DateTimeField(default=datetime.datetime(2018, 7, 23, 12, 33, 4, 208544)),
        ),
    ]