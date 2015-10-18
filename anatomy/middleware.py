from django.conf import settings
from django.utils import translation
from django.http import HttpResponseRedirect
import datetime


class LanguageInPathMiddleware(object):
    def __init__(self):
        self.language_codes = set(dict(settings.LANGUAGES).keys())

    def process_request(self, request):
        language_code = request.path_info.lstrip('/').split('/', 1)[0]
        if language_code in self.language_codes:
            target_domain = settings.LANGUAGE_DOMAINS[language_code]
            print 'target_domain ### ', target_domain, request.META['HTTP_HOST']
            if target_domain != request.META['HTTP_HOST']:
                url = ('http://' + target_domain + request.get_full_path() +
                       '?sessionid=' + request.COOKIES['sessionid'])
                print 'redir', url
                return HttpResponseRedirect(url)
            if request.COOKIES.get('sessionid', 'None') == request.GET.get('sessionid', ''):
                # TODO: remove get param
                pass
            translation.activate(language_code)
            request.LANGUAGE_CODE = translation.get_language()
            request.COOKIES[settings.LANGUAGE_COOKIE_NAME] = language_code
            request.session['django_language'] = language_code
            url = request.get_full_path()
            url = url.replace('/' + language_code, '')
            return HttpResponseRedirect(url)

    def process_response(self, request, response):
        if request.method == 'GET' and 'sessionid' in request.GET:
            max_age = 7 * 24 * 60 * 60
            expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=max_age)
            response.set_cookie('sessionid', request.GET['sessionid'], expires=expires)
        return response
"""
"""
