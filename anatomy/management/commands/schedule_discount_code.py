from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q, Count
from optparse import make_option
from anatomy.models import schedule_email_with_discount_code
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
        users = list(User.objects.annotate(answer_count=Count('answer')).filter(Q(answer_count__gte=options['answer_limit']) & ~Q(email='') & ~Q(email=None)))
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
