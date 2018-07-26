

from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from datetime import date, datetime, timedelta
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.decorators import login_required
from .models import Game, SinglePlayerScore
import json

def login_register(request):
    next = request.GET.get('next', '')
    return render(request, 'login_register.html', {'next': next})

def login_view(request):
    username = request.POST['username']
    password = request.POST['password']
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        if 'next' in request.POST and request.POST['next'] != '':
            return redirect(request.POST['next'])
        return redirect(reverse('app:home'))
    return redirect(reverse('app:login_register'))

def logout_view(request):
    logout(request)
    return redirect(reverse('app:login_register'))

def register(request):
    username = request.POST['username']
    email = request.POST['email']
    password = request.POST['password']
    user = User.objects.create_user(username, email, password)
    login(request, user)
    return redirect(reverse('app:home'))

def home(request):
    return render(request, "home.html")

def practice(request):
    return render(request, "practice.html")

def leaderboard(request):
    return render(request, "leaderboard.html")

def leaderboard_ajax(request):
    filter = request.GET['filter']
    if filter == 'all':
        top10_obj = SinglePlayerScore.objects.order_by('-score')[:10]
    elif filter == 'week':
        top10_obj = SinglePlayerScore.objects.filter(date__gte=datetime.now()-timedelta(days=7)).order_by('-score')[:10]
    elif filter == 'month':
        today = date.today()
        top10_obj = SinglePlayerScore.objects.filter(date__year=today.year, date__month=today.month).order_by('-score')[:10]
    data = {'top10': []}
    for score in top10_obj:
        data['top10'].append(score.toDict())
    return JsonResponse(data)

def contact(request):
    return render(request, "contact.html")

@login_required
def lounge(request):
    games = Game.objects.all()
    return render(request, 'lounge.html', {'games': games})

@login_required
def single_player(request):
    return render(request, "single_player.html")


@login_required
def multi_player(request, game_id):
    game = get_object_or_404(Game, pk=game_id)
    return render(request, "multi_player.html", {"game": game})

@login_required
def single_score(request):
    data = json.loads(request.body)
    score = data['score']
    level = data['level']
    print(str(request.user.username) + " got to level " + str(level) + " and scored a " + str(score))
    record = SinglePlayerScore(player=request.user, score=score, level=level)
    record.save()
    return render(request, "home.html")

