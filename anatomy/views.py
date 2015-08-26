# -*- coding: utf-8 -*-
from django.conf import settings
from django.shortcuts import render_to_response, redirect
import json
from django.utils.translation import ugettext as _
from django.utils.translation import get_language
from proso.django.config import get_global_config
from proso_flashcards.models import Category


def home(request, hack=None):
    JS_FILES = (
        "dist/js/bower-libs.min.js",
        "dist/js/proso-apps-all.js",
        "dist/js/anatomy.min.js",
        "dist/js/anatomy.html.js",
    )
    CSS_FILES = (
        "dist/css/bower-libs.css",
        "dist/css/app.css",
    )
    if not hasattr(request.user, "userprofile") or request.user.userprofile is None:
        user = ''
        email = ''
    else:
        if hack is None:
            return redirect('/overview/')
        user = json.dumps(request.user.userprofile.to_json(stats=True))
        email = request.user.email
    c = {
        'title': _(u'Anatom.cz') + ' - ' + _(u'inteligentní aplikace na procvičování anatomie'),
        'headline': get_headline_from_url(hack),
        'is_production': settings.ON_PRODUCTION,
        'css_files': CSS_FILES,
        'js_files': JS_FILES,
        'continents': Category.objects.filter(
            lang=get_language(), type='continent'),
        'states': Category.objects.filter(lang=get_language(), type='state'),
        'user_json': user,
        'email': email,
        'LANGUAGE_CODE': get_language(),
        'LANGUAGES': settings.LANGUAGES,
        'is_homepage': hack is None,
        'config_json': json.dumps(get_global_config()),
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
            headline = _(u'Předhled znalostí')
    return headline
