from django.conf.urls import url
from django.urls import path
from . import views

app_name = 'channeltest'
urlpatterns = [
    path('', views.test, name='test')
]

