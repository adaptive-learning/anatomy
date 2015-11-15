from django.conf import settings
from django.utils import translation
from django.http import HttpResponseRedirect
import datetime


def redirect_domain(request, target_domain):
    url = ('http://' + target_domain + request.get_full_path() +
           '?sessionid=' + request.COOKIES.get('sessionid', ''))
    return HttpResponseRedirect(url)


def set_lang(request, language_code):
    translation.activate(language_code)
    request.LANGUAGE_CODE = translation.get_language()
    request.COOKIES[settings.LANGUAGE_COOKIE_NAME] = language_code
    request.session[translation.LANGUAGE_SESSION_KEY] = language_code


class LanguageInDomainMiddleware(object):
    def __init__(self):
        self.language_codes = set(dict(settings.LANGUAGES).keys())

    def process_request(self, request):
        language_code = translation.get_language()
        target_domain = settings.LANGUAGE_DOMAINS[language_code]
        if (settings.LANGUAGE_COOKIE_NAME not in request.COOKIES and
                translation.LANGUAGE_SESSION_KEY not in request.session and
                target_domain != request.META['HTTP_HOST']):
            domain_to_lang_dict = dict((v, k) for k, v in settings.LANGUAGE_DOMAINS.iteritems())
            language_code = domain_to_lang_dict[request.META['HTTP_HOST']]
            set_lang(request, language_code)

        language_code = request.path_info.lstrip('/').split('/', 1)[0]
        if language_code in self.language_codes:
            target_domain = settings.LANGUAGE_DOMAINS[language_code]
            if target_domain != request.META['HTTP_HOST']:
                return redirect_domain(request, target_domain)
            if request.COOKIES.get('sessionid', 'None') == request.GET.get('sessionid', ''):
                # TODO: remove get param
                pass
            set_lang(request, language_code)
            url = request.get_full_path()
            url = url.replace('/' + language_code, '')
            return HttpResponseRedirect(url)

    def process_response(self, request, response):
        if request.method == 'GET' and 'sessionid' in request.GET:
            max_age = 7 * 24 * 60 * 60
            expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=max_age)
            response.set_cookie('sessionid', request.GET['sessionid'], expires=expires)
        return response


class GoogleAuthChangeDomain(object):
    def process_request(self, request):
        if request.path_info == '/login/google-oauth2/':
            auth_domain = settings.AUTH_DOMAIN
            if auth_domain != request.META['HTTP_HOST']:
                return redirect_domain(request, auth_domain)
        if request.path_info == '/complete/google-oauth2/':
            language_code = translation.get_language()
            target_domain = settings.LANGUAGE_DOMAINS[language_code]
            if target_domain != request.META['HTTP_HOST']:
                return redirect_domain(request, target_domain)
