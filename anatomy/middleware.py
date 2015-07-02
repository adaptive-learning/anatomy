from django.conf import settings
from django.utils import translation
from django.db import connection
from social_auth.exceptions import AuthAlreadyAssociated
from django.contrib.auth import logout
from django.shortcuts import redirect
from django.http import HttpResponseRedirect


class SqldumpMiddleware(object):

    def process_response(self, request, response):
        if settings.DEBUG and 'sqldump' in request.GET:
            response.content = str(connection.queries)
            response['Content-Type'] = 'text/plain'
        return response


class AuthAlreadyAssociatedMiddleware(object):

    def process_exception(self, request, exception):
        if isinstance(exception, AuthAlreadyAssociated):
            url = request.path  # should be something like '/complete/google/'
            url = url.replace("complete", "login")
            logout(request)
            return redirect(url)


class LanguageInPathMiddleware(object):
    def __init__(self):
        self.language_codes = set(dict(settings.LANGUAGES).keys())

    def process_request(self, request):
        language_code = request.path_info.lstrip('/').split('/', 1)[0]
        if language_code in self.language_codes:
            translation.activate(language_code)
            request.LANGUAGE_CODE = translation.get_language()
            request.COOKIES[settings.LANGUAGE_COOKIE_NAME] = language_code
            request.session['django_language'] = language_code
            url = request.path
            url = url.replace('/' + language_code, '')
            return HttpResponseRedirect(url)
