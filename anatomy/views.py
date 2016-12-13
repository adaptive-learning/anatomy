# -*- coding: utf-8 -*-
from django.conf import settings
from django.shortcuts import render_to_response, redirect
import json
from django.utils.translation import ugettext as _
from django.utils.translation import get_language
from proso_common.models import get_global_config
from proso_flashcards.models import Category
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core import management
from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
from django.core.cache import cache
import os
from proso_models.models import get_environment
from proso_flashcards.models import FlashcardAnswer, Flashcard
import random
import base64
from proso_subscription.models import Subscription
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from gopay.enums import PaymentStatus
from django.db.models import Q
from django.views.decorators.cache import cache_page


@login_required
def invoice(request, subscription_id):
    subscription = get_object_or_404(Subscription, pk=subscription_id)
    if not request.user.is_staff and subscription.user_id != request.user.id:
        return HttpResponse('Unauthorized', status=401)
    if subscription.payment is None or subscription.payment.state != PaymentStatus.PAID:
        return HttpResponse('There is no invoice for the given subscription.', 400)
    data = {
        'request': request,
        'subscription': subscription,
        'user': subscription.user,
        'invoice_number': get_invoice_number(subscription),
    }
    if request.user.is_staff:
        other_keys = ['first_name', 'last_name', 'ic', 'dic', 'address_1', 'address_2', 'address_3']
        for key in other_keys:
            data[key] = request.GET.get(key)
    return render_to_response('invoice.html', data)


@ensure_csrf_cookie
def home(request, hack=None):
    min_hack = '.min' if 'unmin' not in request.GET else ''
    print(min_hack, request.GET.get('unmin', 'HHH'))

    JS_FILES = (
        "dist/js/bower-libs" + min_hack + ".js",
        "dist/js/unminifiable-libs.js",
        "dist/js/anatomy" + min_hack + ".js",
    )
    CSS_FILES = (
        "dist/css/all.min.css",
    )

    if not hasattr(request.user, "userprofile") or request.user.userprofile is None:
        environment = get_environment()
        user = {
            'user': {
                'username': '',
            },
            'number_of_answers': environment.number_of_answers(user=request.user.id) if request.user.id is not None else 0,
            'number_of_correct_answers': environment.number_of_correct_answers(user=request.user.id) if request.user.id is not None else 0,
        }
        email = ''
    else:
        if hack is None:
            return redirect('/overview/')
        user = request.user.userprofile.to_json(stats=True)
        user['subscribed'] = has_active_subscription(request)
        email = request.user.email
        if not request.user.userprofile.public:
            request.user.userprofile.public = True
            request.user.userprofile.save()
    user_json = json.dumps(user)
    stats = {
        'number_of_answers': FlashcardAnswer.objects.count(),
    }
    if hack == 'home':
        hack = None
    categories = [c.to_json() for c in Category.objects.filter(
        lang=get_language(), active=True)]

    c = {
        'title': _('Anatom.cz') + ' - ' + _('procvičování anatomie člověka v obrázcích'),
        'headline': get_headline_from_url(hack),
        'is_production': settings.ON_PRODUCTION,
        'css_files': CSS_FILES,
        'js_files': JS_FILES,
        'screenshot_files': get_screenshot_files(request, hack),
        'user_json': user_json,
        'user': user,
        'email': email,
        'LANGUAGE_CODE': get_language(),
        'LANGUAGES': settings.LANGUAGES,
        'LANGUAGE_DOMAINS': settings.LANGUAGE_DOMAINS,
        'is_practice': hack is not None and hack.startswith("practice/"),
        'include_template': get_template(request, hack),
        'hack': hack or '',
        'config_json': json.dumps(get_global_config()),
        'DOMAIN': request.build_absolute_uri('/')[:-1],
        'stats': stats,
        'stats_json': json.dumps(stats),
        'canonical_url': 'https://' + request.META['HTTP_HOST'] + request.get_full_path().split('?')[0].replace('//', '/'),
        'base': '//' + request.META['HTTP_HOST'],
        'canonical_path':  request.get_full_path().split('?')[0][1:].replace('//', '/'),
        'categories_json': json.dumps({'data': categories}),
        'show_inspectlet': random.randrange(40) < 1,
    }
    return render_to_response('home.html', c)


def get_template(request, hack):
    mapping = {
        'premium': "generated/static/tpl/premium.html",
        'overview': "generated/static/tpl/overview_tpl.html",
        'relationsoverview': "generated/static/tpl/overview_tpl.html",
    }
    if hack is None:
        return "generated/static/tpl/homepage.html"
    elif hack in mapping:
        return mapping[hack]


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
        if url[0] == 'view' or url[0] == 'relations' or url[0] == 'practice':
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
        elif url[0] == 'overview':
            headline = _('Přehled znalostí')
        elif url[0] == 'relationsoverview':
            headline = _('Souvislosti')
    return headline


def load_flashcards(request):
    context = request.GET.get('context', '')
    filepath = os.path.join(os.environ.get('EXPORT_PATH', '.'), 'image-' + context + '.json')
    if os.path.isfile(filepath):
        management.call_command(
            'load_flashcards',
            filepath,
            ignored_flashcards='disable',
            skip_language_check=True,
            verbosity=0,
            interactive=False)
        cache.clear()
        response = """{
            "type": "success",
            "msg" : "Kontext '%s' byl úspěšně nahrán na %s"
        }""" % (context, request.build_absolute_uri('/')[:-1])
        if request.GET['callback'] is not None:
                response = request.GET['callback'] + '(' + response + ')'
        return HttpResponse(response, content_type='application/javascript')
    else:
        return HttpResponseBadRequest('Error, invalid context: ' + context)


def save_screenshot(request):
    if request.body:
        data = json.loads(request.body.decode("utf-8"))
        image = data['image']
        data['name'] = strip_non_ascii(data['name'])
        filename = os.path.join(
            settings.MEDIA_ROOT, 'thumbs', data['name'] + '.png')
        save_base64_to_file(filename, image)
        if hasattr(request.user, "username"):
            filename = os.path.join(
                settings.MEDIA_ROOT,
                'userthumbs',
                request.user.username + '--' + data['name'] + '.png')
            save_base64_to_file(filename, image)

        response = """{
            "type": "success",
            "msg" : "Obrázek byl úspěšně nahrán"
        }"""
        return HttpResponse(response, content_type='application/javascript')


def save_base64_to_file(filename, image):
    directory = os.path.dirname(filename)
    if not os.path.exists(directory):
        os.makedirs(directory)
    head = 'data:image/png;base64,'
    if head in image:
        image = image[len(head):]
        file_size = os.path.getsize(filename) if os.path.exists(filename) else 0
        image_encoded = base64.b64decode(image)
        if file_size < len(image_encoded):
            fh = open(filename, "wb")
            fh.write(image_encoded)
            fh.close()


def strip_non_ascii(string):
    ''' Returns the string without non ASCII characters'''
    stripped = (c for c in string if 0 < ord(c) < 127)
    return ''.join(stripped)


def has_active_subscription(request):
    return Subscription.objects.is_active(request.user, 'full')


def get_invoice_number(subscription):
    if subscription.payment_id is None or subscription.payment.state != PaymentStatus.PAID:
        return None
    before = Subscription.objects.filter(
        Q(payment__state=PaymentStatus.PAID, payment__updated__year=subscription.payment.updated.year) & (
            Q(payment__updated__lt=subscription.payment.updated) |
            Q(payment__updated=subscription.payment.updated, payment__pk__lt=subscription.payment.pk)
        )
    ).count()
    return '{}1{}'.format(subscription.payment.updated.year, str(before + 1).zfill(5))


@cache_page(60 * 60 * 24)
def all_flashcards(request):
    def term_to_json_optimized(term):
        data = {
            'name': term.name,
            'id': term.id,
        }
        return data

    def fc_to_json_optimized(fc):
        data = {
            'item_id': fc.item_id,
            'context_id': fc.context_id,
        }
        if fc.description is not None:
            data['description'] = fc.description
        if fc.term is not None:
            data['term'] = term_to_json_optimized(fc.term)
        if fc.term_secondary is not None:
            data['term_secondary'] = term_to_json_optimized(fc.term_secondary)

        return data

    flashcards = Flashcard.objects.select_related(
        'term', 'term_secondary').filter(
        active=True, lang=request.GET.get('language', get_language()))
    response = {
        'data': [fc_to_json_optimized(fc) for fc in flashcards],
    }
    return JsonResponse(response)
