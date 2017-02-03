from collections import namedtuple
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import translation
from gopay.enums import PaymentStatus
from gopay_django_api.signals import payment_changed
from proso.django.request import get_current_request, get_language
from proso_models.models import Answer
from proso_subscription.models import DiscountCode, Subscription
from proso_user.models import UserProfile, ScheduledEmail
import datetime
import glob
import os
import random


def canonize_language_for_email(lang):
    if lang in {'cs', 'cc'}:
        return 'cs'
    else:
        return 'en'


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


def schedule_invoice_email(subscription):
    language = subscription.plan_description.lang
    translation.activate(language)
    DummyRequest = namedtuple('DummyRequest', 'scheme get_host')
    request = DummyRequest(
        scheme='https',
        get_host=settings.LANGUAGE_DOMAINS[language]
    )
    data = {
        'request': request,
        'subscription': subscription,
        'invoice_number': get_invoice_number(subscription),
        'lang': language,
    }
    template = os.path.join(settings.BASE_DIR, 'anatomy', 'templates', 'invoice.html')
    ScheduledEmail.objects.schedule_more(
        'info@anatom.cz',
        ('Anatom: Faktura {}' if language == 'cs' else 'Practice Anatomy: Invoice {}').format(data['invoice_number']) + (' [STAGING]' if settings.ON_STAGING else ''),
        template,
        users=[subscription.user],
        template_kwargs=data
    )
    staff_users = User.objects.filter(is_staff=True)
    translation.activate('cs')
    ScheduledEmail.objects.schedule_more(
        'info@anatom.cz',
        'Anatom: Faktura {} [ADMIN]'.format(data['invoice_number']) + (' [STAGING]' if settings.ON_STAGING else ''),
        template,
        users=list(staff_users),
        template_kwargs=data
    )


def schedule_email_with_discount_code(user, discount_percentage=50, dry=False, output_dir=None):
    discount_code = DiscountCode.objects.filter(identifier='email_user_discount_code_{}'.format(user.id)).first()
    if discount_code is None:
        discount_code = DiscountCode.objects.create(
            identifier='email_user_discount_code_{}'.format(user.id),
            usage_limit=1,
            code=DiscountCode.objects.generate_code(),
            discount_percentage=discount_percentage
        )
    request = get_current_request(force=False)
    if request is not None:
        language = get_language(request)
    else:
        last_answer = Answer.objects.filter(user=user).order_by('-id').first()
        language = last_answer.lang if last_answer is not None else 'en'
    language = canonize_language_for_email(language)
    ScheduledEmail.objects.schedule_more(
        'info@anatom.cz',
        'Anatom: Děkujeme, že sis vybral(a) nás' if language == 'cs' else 'Practice Anatomy: Thank you chose us',
        os.path.join(settings.BASE_DIR, 'anatomy', 'templates', 'email', 'thanks_discount_code_{}.html'.format(language)),
        users=[user],
        template_kwargs={'discount_code': discount_code},
        dry=dry,
        output_dir=output_dir
    )


@receiver(post_save)
def schedule_email_with_discount_code_after_long_practice(sender, instance, created=False, **kwargs):
    if not issubclass(sender, Answer):
        return
    if not created:
        return
    request = get_current_request(force=False)
    if request is None:
        return
    if not request.user.is_authenticated() or not request.user.email:
        return
    answer_count = Answer.objects.filter(user=request.user).count()
    if answer_count != 200:
        return
    if Subscription.objects.is_active(request.user, 'full'):
        return
    schedule_email_with_discount_code(request.user)


@receiver(post_save, sender=UserProfile)
def schedule_welcome_email(sender, instance, created=False, **kwargs):
    if not created:
        return
    if instance.user.email is None or instance.user.email == '':
        return
    request = get_current_request(force=False)
    if request is None:
        return
    language = get_language(request)
    language = canonize_language_for_email(language)
    ScheduledEmail.objects.schedule_more(
        'info@anatom.cz',
        'Anatom: Vítej' if language == 'cs' else 'Practice Anatomy: Welcome',
        os.path.join(settings.BASE_DIR, 'anatomy', 'templates', 'email', 'welcome_{}.html'.format(language)),
        users=[instance.user]
    )
    # reminder e-mails
    templates = glob.glob(os.path.join(settings.BASE_DIR, 'anatomy', 'templates', 'email', 'relation_question_{}_*.html'.format(language)))
    random.shuffle(templates)
    shifts = [1, 3, 7]
    last_datetime = datetime.datetime.now()
    for i, template in enumerate(templates):
        shift = shifts[min(i, len(shifts) - 1)]
        last_datetime = last_datetime + datetime.timedelta(days=shift)
        ScheduledEmail.objects.schedule_more(
            'info@anatom.cz',
            'Anatom: Otázka dne' if language == 'cs' else 'Practice Anatomy: Today\'s question',
            template,
            users=[instance.user],
            scheduled=last_datetime
        )


@receiver(payment_changed)
def schedule_invoice(sender, instance, previous_status, **kwargs):
    if previous_status['state'] == PaymentStatus.PAID or instance.state != PaymentStatus.PAID:
        return
    subscription = Subscription.objects.select_related('user', 'plan_description').get(payment=instance)
    schedule_invoice_email(subscription)
