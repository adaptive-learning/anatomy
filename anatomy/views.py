# -*- coding: utf-8 -*-
from django.conf import settings
from django.shortcuts import render_to_response, redirect
import json
from django.utils.translation import ugettext as _
from django.utils.translation import get_language
from proso.django.config import get_global_config
from proso_flashcards.models import Category
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core import management
from django.http import HttpResponse, HttpResponseBadRequest
from django.core.cache import cache
import os
from proso_models.models import get_environment
from proso_flashcards.models import FlashcardAnswer, Flashcard
from datetime import datetime, timedelta
import random


@ensure_csrf_cookie
def home(request, hack=None):
    JS_FILES = (
        "dist/js/bower-libs.min.js",
        "dist/js/unminifiable-libs.js",
        "dist/js/anatomy.min.js",
    )
    CSS_FILES = (
        "dist/css/bower-libs.css",
        "dist/css/app.css",
    )

    if not hasattr(request.user, "userprofile") or request.user.userprofile is None:
        environment = get_environment()
        user = json.dumps({
            'user': {},
            'number_of_answers': environment.number_of_answers(user=request.user.id) if request.user.id is not None else 0,
            'number_of_correct_answers': environment.number_of_correct_answers(user=request.user.id) if request.user.id is not None else 0,
        })
        email = ''
    else:
        if hack is None:
            return redirect('/overview/')
        user = json.dumps(request.user.userprofile.to_json(stats=True))
        email = request.user.email
        if not request.user.userprofile.public:
            request.user.userprofile.public = True
            request.user.userprofile.save()
    hour_ago = datetime.now() - timedelta(hours=1)
    stats = {
        'number_of_answers': FlashcardAnswer.objects.count(),
        'answers_per_second': FlashcardAnswer.objects.filter(
            time__gt=hour_ago).count() / 3600.0,
        'number_of_flashcards': Flashcard.objects.filter(
            active=True, lang=get_language()).count(),
    }
    if hack == 'home':
        hack = None
    c = {
        'title': _(u'Anatom.cz') + ' - ' + _(u'procvičování anatomie člověka v obrázcích'),
        'headline': get_headline_from_url(hack),
        'is_production': settings.ON_PRODUCTION,
        'css_files': CSS_FILES,
        'js_files': JS_FILES,
        'screenshot_files': get_screenshot_files(request, hack),
        'user_json': user,
        'email': email,
        'LANGUAGE_CODE': get_language(),
        'LANGUAGES': settings.LANGUAGES,
        'LANGUAGE_DOMAINS': settings.LANGUAGE_DOMAINS,
        'is_homepage': hack is None,
        'hack': hack or '',
        'config_json': json.dumps(get_global_config()),
        'DOMAIN': request.build_absolute_uri('/')[:-1],
        'stats_json': json.dumps(stats),
        'canonical_url': 'https://' + request.META['HTTP_HOST'] + request.get_full_path().split('?')[0].replace('//', '/'),
        'canonical_path':  request.get_full_path().split('?')[0][1:].replace('//', '/'),
    }
    return render_to_response('home.html', c)


def get_screenshot_files(request, hack):
    screenshot_files = [
        "/static/img/screenshot-" + get_language() + ".png",
        "/static/img/practice-" + get_language() + ".png",
        "/static/img/select-" + get_language() + ".png",
        "/static/img/view-image-" + get_language() + ".png",
    ]

    path = os.path.join(settings.STATICFILES_DIRS[0], 'img', 'thumb')
    dirs = os.listdir(path)

    for file in dirs:
        if get_language() + '.png' in file:
            screenshot_files.append('/static/img/thumb/' + file)
    random.shuffle(screenshot_files)
    screenshot_files[0] = "/static/img/thumb/practice-heart-" + get_language() + ".png"
    if request.GET.get('thumb', None) is not None:
        screenshot_files[0] = "/static/img/thumb/" + request.GET['thumb'] + "-" + get_language() + ".png"
    return screenshot_files[:5]


def get_headline_from_url(hack):
    headline = ""
    if hack:
        url = hack.split('/')
        if url[0] == u'view' or url[0] == u'practice':
            try:
                category = Category.objects.get(
                    lang=get_language(), identifier=url[1])
                headline = category.name
            except Category.DoesNotExist:
                pass
            try:
                if len(url) > 2:
                    category = Category.objects.get(
                        lang=get_language(), identifier=url[2])
                    headline += ' - ' + category.name
            except Category.DoesNotExist:
                pass
        elif url[0] == u'overview':
            headline = _(u'Přehled znalostí')
    return headline


def load_flashcards(request):
    context = request.GET.get('context', '')
    filepath = os.path.join(os.environ.get('EXPORT_PATH', '.'), 'image-' + context + '.json')
    if os.path.isfile(filepath):
        management.call_command(
            'load_flashcards',
            filepath,
            ignored_flashcards='disable',
            verbosity=0,
            interactive=False)
        categories = Category.objects.filter(children_type=Category.CATEGORIES)
        for c in categories:
            c.children_type = Category.TERMS
            c.save()
        cache.clear()
        response = u"""{
            "type": "success",
            "msg" : "Obrázek byl úspěšně nahrán na %s"
        }""" % request.build_absolute_uri('/')[:-1]
        if request.GET['callback'] is not None:
                response = request.GET['callback'] + '(' + response + ')'
        return HttpResponse(response, content_type='application/javascript')
    else:
        return HttpResponseBadRequest('Error, invalid context: ' + context)
