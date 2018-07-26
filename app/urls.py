
from django.urls import path
from . import views

app_name = 'app'
urlpatterns = [
    path('login_register/', views.login_register, name='login_register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register, name='register'),
    path('lounge/', views.lounge, name='lounge'),
    path('single_player/', views.single_player, name='single_player'),
    path('multi_player/<int:game_id>/', views.multi_player, name='multi_player'),
    path('single_score/', views.single_score, name='single_score'),
    path('home/', views.home, name='home'),
    path('practice/', views.practice, name='practice'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('leaderboard_ajax/', views.leaderboard_ajax, name='leaderboard_ajax'),
    path('contact/', views.contact, name='contact'),
]




