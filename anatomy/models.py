from django.db.models.signals import post_save
from django.dispatch import receiver
from proso_user.models import UserProfile, ScheduledEmail
from proso.django.request import get_current_request, get_language
from django.conf import settings
import os


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
    if language != 'cs':
        language = 'en'
    ScheduledEmail.objects.schedule_more(
        'info@anatom.cz',
        'Anatom: Vítej' if language == 'cs' else 'Practice Anatomy: Welcome',
        os.path.join(settings.BASE_DIR, 'anatomy', 'templates', 'email', 'welcome_{}.html'.format(language)),
        [instance.user.email]
    )
