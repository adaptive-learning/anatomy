from anatomy.models import schedule_email_with_discount_code
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q, Count, Max
from optparse import make_option
from proso_user.models import ScheduledEmail
import datetime
import os


class Command(BaseCommand):

    option_list = BaseCommand.option_list + (
        make_option(
            '--active-from',
            dest='active_from',
            default=None
        ),
        make_option(
            '--discount-percentage',
            dest='discount_percentage',
            default=50
        ),
        make_option(
            '--answer-limit',
            dest='answer_limit',
            default=200
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
        already_processed = set(ScheduledEmail.objects.filter(
            Q(subject__contains='Anatom: Děkujeme, že sis vybral(a) nás') | Q(subject='Practice Anatomy: Thank you chose us')
        ).values_list('user_id', flat=True))
        users = [u for u in users if u.id not in already_processed]
        if options['skip_emails_file'] is not None:
            with open(os.path.realpath(options['skip_emails_file']), 'r') as f:
                skip_emails = set(f.readlines())
                users = [u for u in users if u.email not in skip_emails]
        if len(users) == 0:
            return
        for user in users:
            schedule_email_with_discount_code(
                user,
                options['discount_percentage'],
                dry=options['dry'],
                output_dir=os.path.realpath(options['output']) if options['output'] else None
            )
