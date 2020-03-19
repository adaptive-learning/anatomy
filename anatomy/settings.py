# -*- coding: utf-8 -*-
import os
import dj_database_url
from django.conf import settings
from gopay.enums import PaymentInstrument, Currency, Language

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DATA_DIR = os.environ.get('PROSO_DATA_DIR', os.path.join(BASE_DIR, 'data'))
MEDIA_ROOT = os.environ.get('PROSO_MEDIA_ROOT', os.path.join(BASE_DIR, '../media'))
MEDIA_URL = '/media/'
FILEBROWSER_DIRECTORY = 'thumbs/'

SECRET_KEY = os.getenv('PROSO_SECRET_KEY', 'really secret key')

ON_PRODUCTION = False
ON_STAGING = False

if os.environ.get('PROSO_ON_PRODUCTION', False):
    ON_PRODUCTION = True
if os.environ.get('PROSO_ON_STAGING', False):
    ON_STAGING = True

if ON_PRODUCTION:
    DEBUG = False
else:
    DEBUG = True

TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Adaptive Learning - Logs', 'al-logs@googlegroups.com'),
)

EMAIL_SUBJECT_PREFIX = '[anatom.cz] '

ALLOWED_HOSTS = [
    'anatom.cz',
    'practiceanatomy.com',
]


# Application definition

INSTALLED_APPS = (
    'anatomy',
    'debug_toolbar',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.messages',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'filebrowser',
    'gopay_django_api',
    'grappelli',
    'lazysignup',
    'proso_common',
    'proso_configab',
    'proso_feedback',
    'proso_flashcards',
    'proso_models',
    'proso_subscription',
    'proso_user',
    'social.apps.django_app.default',
)
if ON_PRODUCTION or ON_STAGING:
    INSTALLED_APPS += ('raven.contrib.django.raven_compat',)
    RAVEN_CONFIG = {
        'dsn': os.getenv('RAVEN_DSN')
    }

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'proso.django.request.RequestMiddleware',
    'proso.django.cache.RequestCacheMiddleware',
    'proso.django.log.RequestLogMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'anatomy.middleware.LanguageInDomainMiddleware',
    'anatomy.middleware.GoogleAuthChangeDomain',
    'proso_common.middleware.AuthAlreadyAssociatedMiddleware',
)

ROOT_URLCONF = 'anatomy.urls'

WSGI_APPLICATION = 'anatomy.wsgi.application'

TEMPLATE_CONTEXT_PROCESSORS = \
    settings.TEMPLATE_CONTEXT_PROCESSORS + ["proso_common.context_processors.config_processor"]

# Database
# https://docs.djangoproject.com/en/1.7/ref/settings/#databases
DATABASES = {
    'default': dj_database_url.config(),
}

# Internationalization
# https://docs.djangoproject.com/en/1.7/topics/i18n/

LANGUAGE_CODE = 'cs'

LANGUAGES = (
    ('cs', 'Česky'),
    ('en', 'English'),
)

if ON_PRODUCTION:
    LANGUAGE_DOMAINS = {
        'cs': 'anatom.cz',
        'en': 'practiceanatomy.com',
    }
    AUTH_DOMAIN = 'anatom.cz'
elif ON_STAGING:
    LANGUAGE_DOMAINS = {
        'cs': 'staging.anatom.cz',
        'en': 'staging.practiceanatomy.com',
    }
    AUTH_DOMAIN = 'staging.anatom.cz'
else:
    LANGUAGE_DOMAINS = {
        'cs': 'localhost:8003',
        'en': '127.0.0.1:8003',
    }
    AUTH_DOMAIN = 'localhost:8003'

LOCALE_PATHS = (
    os.path.join(BASE_DIR, 'conf', 'locale'),
)

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.7/howto/static-files/

STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.CachedStaticFilesStorage'
STATIC_ROOT = os.path.join(BASE_DIR, '..', 'static')
STATIC_URL = '/static/'

STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'anatomy', 'static'),
)

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'lazysignup.backends.LazySignupBackend',
    'social.backends.facebook.FacebookOAuth2',
    'social.backends.google.GoogleOAuth2',
)

SOCIAL_AUTH_FACEBOOK_KEY = os.getenv('PROSO_FACEBOOK_APP_ID', '')
SOCIAL_AUTH_FACEBOOK_SECRET = os.getenv('PROSO_FACEBOOK_API_SECRET', '')
SOCIAL_AUTH_FACEBOOK_SCOPE = ['email']
SOCIAL_AUTH_FACEBOOK_PROFILE_EXTRA_PARAMS = {
    'fields': 'id, name, email',
}

SOCIAL_AUTH_CREATE_USERS = True
SOCIAL_AUTH_FORCE_RANDOM_USERNAME = False
SOCIAL_AUTH_DEFAULT_USERNAME = 'socialauth_user'
LOGIN_ERROR_URL = '/login/error/'
SOCIAL_AUTH_ERROR_KEY = 'socialauth_error'
SOCIAL_AUTH_RAISE_EXCEPTIONS = False
SOCIAL_AUTH_SESSION_EXPIRATION = False
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.getenv('PROSO_GOOGLE_OAUTH2_CLIENT_ID', '')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.getenv('PROSO_GOOGLE_OAUTH2_CLIENT_SECRET', '')

# http://stackoverflow.com/questions/22005841/is-not-json-serializable-django-social-auth-facebook-login
SESSION_SERIALIZER='django.contrib.sessions.serializers.PickleSerializer'

LOGIN_REDIRECT_URL = '/'

SOCIAL_AUTH_DEFAULT_USERNAME = 'new_social_auth_user'

SOCIAL_AUTH_UID_LENGTH = 222
SOCIAL_AUTH_NONCE_SERVER_URL_LENGTH = 200
SOCIAL_AUTH_ASSOCIATION_SERVER_URL_LENGTH = 135
SOCIAL_AUTH_ASSOCIATION_HANDLE_LENGTH = 125

EMAIL_HOST = 'localhost'
EMAIL_PORT = 25

LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'filters': [],
            'formatter': 'simple'
        },
        'request': {
            'level': 'DEBUG',
            'class': 'proso.django.log.RequestHandler',
            'formatter': 'simple'
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'mail_admins_javascript': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'proso.django.log.AdminJavascriptEmailHandler'
        },
        'anatomy_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(DATA_DIR, 'anatomy.log'),
            'formatter': 'simple',
        },
        'sentry': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'raven.contrib.django.raven_compat.handlers.SentryHandler',
        },
    },
    'formatters': {
        'simple': {
            'format': '[%(asctime)s] %(levelname)s "%(message)s"'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['console', 'request', 'mail_admins', 'anatomy_file', 'sentry'],
            'propagate': True,
            'level': 'DEBUG'
        },
        'javascript': {
            'handlers': ['console', 'mail_admins_javascript', 'anatomy_file', 'sentry'],
            'propagate': True,
            'level': 'INFO',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },

}

if ON_PRODUCTION:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
            'LOCATION': '127.0.0.1:11211',
            'TIMEOUT': 60 * 60 * 24 * 7,
            'OPTIONS': {
                'MAX_ENTRIES': 300000,
            },
        },
        'file': {
            'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
            'LOCATION': os.path.join(DATA_DIR, '.django_cache'),
            'TIMEOUT': 60 * 60 * 24 * 7,
            'OPTIONS': {
                'MAX_ENTRIES': 30000,
            },
        },
    }
elif ON_STAGING:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
            'LOCATION': os.path.join(DATA_DIR, '.django_cache'),
            'TIMEOUT': 60 * 60 * 24 * 7,
            'OPTIONS': {
                'MAX_ENTRIES': 30000,
            },
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

PROSO_CONFIG = {
    'path': os.path.join(BASE_DIR, 'anatomy', 'proso_config.yaml'),
}
PROSO_FLASHCARDS = {}

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(BASE_DIR, 'anatomy', 'templates'),
)

try:
    from hashes import HASHES
except ImportError:
    HASHES = {}
except SyntaxError:
    HASHES = {}

PROSO_JS_FILES = ['dist/js/bower-libs.js', 'dist/js/proso-apps-all.js']

GOPAY_DOMAIN = 'http://' + AUTH_DOMAIN
GOPAY_GOID = os.environ.get('GOPAY_GOID')
GOPAY_CLIENT_ID = os.environ.get('GOPAY_CLIENT_ID')
GOPAY_CLIENT_SECRET = os.environ.get('GOPAY_CLIENT_SECRET')
GOPAY_IS_PRODUCTION = ON_PRODUCTION
GOPAY_LANG = Language.CZECH
GOPAY_DEFAULT_PAYMENT_INSTRUMENT = PaymentInstrument.PAYMENT_CARD
GOPAY_ALLOWED_PAYMENT_INSTRUMENTS = [
    PaymentInstrument.PAYMENT_CARD,
    PaymentInstrument.BANK_ACCOUNT,
    PaymentInstrument.PAYPAL,
]
GOPAY_CURRENCY = Currency.CZECH_CROWNS
GOPAY_ALLOWED_SWIFTS = ['KOMBCZPP', 'RZBCCZPP', 'BREXCZPP', 'FIOBCZPP', 'GIBACZPX']
