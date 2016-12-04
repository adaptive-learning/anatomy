from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q, Count, Max
from optparse import make_option
from proso_user.models import ScheduledEmail
from proso_models.models import Answer
import datetime
import glob
import os
import random


class Command(BaseCommand):

    option_list = BaseCommand.option_list + (
        make_option(
            '--active-from',
            dest='active_from',
            default=None
        ),
        make_option(
            '--answer-limit',
            dest='answer_limit',
            default=0
        ),
        make_option(
            '--dry',
            dest='dry',
            action='store_true',
            default=False
        ),
        make_option(
            '--output',
            dest='output',
            default=None
        ),
        make_option(
            '--skip-emails-file',
            dest='skip_emails_file',
            default=None
        )
    )

    def handle(self, *args, **options):
        if options['active_from'] is None:
            raise CommandError('The "active-from" option has to be specified.')
        active_from = datetime.datetime.strptime(options['active_from'], '%Y-%m-%d')
        users = list(User.objects.annotate(
            answer_count=Count('answer'),
            answer_time=Max('answer__time')
        ).filter(
            Q(answer_count__gte=options['answer_limit']) & Q(answer_time__gte=active_from) & ~Q(email='') & ~Q(email=None)
        ))
        if options['skip_emails_file'] is not None:
            with open(os.path.realpath(options['skip_emails_file']), 'r') as f:
                skip_emails = set(f.readlines())
                users = [u for u in users if u.email not in skip_emails]
        if len(users) == 0:
            return
        templates = {}
        for lang in ['cs', 'en']:
            templates[lang] = glob.glob(os.path.join(settings.BASE_DIR, 'anatomy', 'templates', 'email', 'relation_question_{}_*.html'.format(lang)))
        shifts = [1, 3, 7]
        for user in users:
            czech_answers = Answer.objects.filter(user_id=user.id, lang__in=['cs', 'cc']).count()
            language = 'cs' if czech_answers > 0 else 'en'
            user_templates = list(templates[language])
            random.shuffle(user_templates)
            last_datetime = datetime.datetime.now()
            for i, template in enumerate(user_templates):
                shift = shifts[min(i, len(shifts) - 1)]
                last_datetime = last_datetime + datetime.timedelta(days=shift)
                ScheduledEmail.objects.schedule_more(
                    'info@anatom.cz',
                    'Anatom: Otázka dne' if language == 'cs' else 'Practice Anatomy: Today\'s question',
                    template,
                    users=[user],
                    scheduled=last_datetime,
                    dry=options['dry'],
                    output_dir=options['output']
                )
