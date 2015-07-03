# -*- coding: utf-8 -*-
from django.conf import settings
from django.shortcuts import render_to_response
import json
from django.utils.translation import ugettext as _
from django.utils.translation import get_language
from proso.django.config import get_global_config
from proso_flashcards.models import Category
from django.views.decorators.cache import cache_page
from django.views.i18n import javascript_catalog


def home(request, hack=None):
    JS_FILES = (
        "dist/js/bower-libs.js",
        "dist/js/anatomy.js",
        "dist/js/anatomy.html.js",
    )
    CSS_FILES = (
        "dist/css/bower-libs.css",
        "dist/css/app.css",
        "dist/css/map.css"
    )
    if not hasattr(request.user, "userprofile") or request.user.userprofile is None:
        user = ''
        email = ''
    else:
        user = json.dumps(request.user.userprofile.to_json(stats=True))
        email = request.user.email
    c = {
        'title': _(u'Anatom.cz') + ' - ' + _(u'inteligentní aplikace na procvičování anatomie'),
        'map': get_map_from_url(hack),
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


def get_map_from_url(hack):
    map_string = ""
    if hack:
        url = hack.split('/')
        if url[0] == u'view' or url[0] == u'practice':
            map_code = url[1]
            try:
                map_category = Category.objects.get(lang=get_language(), identifier=map_code)
                map_string = map_category.name
                if len(url) >= 3 and url[2] != '':
                    map_string = map_string  # + ' - ' + resolve_map_type(url[2])
            except Category.DoesNotExist:
                pass
    return map_string


@cache_page(86400)
def cached_javascript_catalog(request, domain='djangojs', packages=None):
    return javascript_catalog(request, domain, packages)
