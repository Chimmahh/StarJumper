

from django.shortcuts import render, get_object_or_404, redirect
from .utils import get_game_or_error
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.decorators import login_required
from .models import Game

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
        return redirect(reverse('app:lounge'))
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
    return redirect(reverse('app:lounge'))

def lounge(request):
    games = Game.objects.all()
    return render(request, 'lounge.html', {'games': games})

def single_player(request):
    return render(request, "single_player.html")

def multi_player(request, game_id):
    game = get_object_or_404(Game, pk=game_id)
    return render(request, "multi_player.html", {"game": game})
