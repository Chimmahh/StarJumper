from django.urls import path
from . import views

app_name = 'app'
urlpatterns = [
    path('login_register/', views.login_register, name='login_register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register, name='register'),
    path('home/', views.home, name='home'),
    # path('<str:game_name>/play/', views.play, name='play'),
    path('play/<int:game_id>/', views.play, name='play'),
]