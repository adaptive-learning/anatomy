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
    screenshot_files = [
        "/static/img/screenshot-" + get_language() + ".png",
        "/static/img/practice-" + get_language() + ".png",
        "/static/img/select-" + get_language() + ".png",
        "/static/img/view-image-" + get_language() + ".png",
        "/static/img/knowledge-" + get_language() + ".png",
    ]
    if hack is not None and 'practice' in hack:
        screenshot_files[0], screenshot_files[1] = screenshot_files[1], screenshot_files[0]
    elif hack is not None and ('overview' in hack or 'view' in hack):
        screenshot_files[0], screenshot_files[2] = screenshot_files[2], screenshot_files[0]

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
    c = {
        'title': _(u'Anatom.cz') + ' - ' + _(u'inteligentní aplikace na procvičování anatomie'),
        'headline': get_headline_from_url(hack),
        'is_production': settings.ON_PRODUCTION,
        'css_files': CSS_FILES,
        'js_files': JS_FILES,
        'screenshot_files': screenshot_files,
        'continents': Category.objects.filter(
            lang=get_language(), type='continent'),
        'states': Category.objects.filter(lang=get_language(), type='state'),
        'user_json': user,
        'email': email,
        'LANGUAGE_CODE': get_language(),
        'LANGUAGES': settings.LANGUAGES,
        'is_homepage': hack is None,
        'config_json': json.dumps(get_global_config()),
        'DOMAIN': request.build_absolute_uri('/')[:-1],
    }
    return render_to_response('home.html', c)


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
        cache.clear()
        response = u"""{
            "type": "success",
            "msg" : "Obrázek byl úspěšně nahrán na anatom.cz"
        }"""
        if request.GET['callback'] is not None:
                response = request.GET['callback'] + '(' + response + ')'
        return HttpResponse(response, content_type='application/javascript')
    else:
        return HttpResponseBadRequest('Error, invalid context: ' + context)
