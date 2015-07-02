from django.core.management.base import BaseCommand
from collections import defaultdict
from contextlib import closing
from django.db import connection


class Command(BaseCommand):

    def handle(self, *args, **options):
        ips = defaultdict(list)
        with closing(connection.cursor()) as cursor:
            cursor.execute('SELECT id, ip_address FROM proso_user_location')
            for i, ip in cursor:
                ips[ip].append(i)
        with closing(connection.cursor()) as cursor:
            for ip, ids in ips.iteritems():
                new_id = min(ids)
                ids_str = ','.join(map(str, ids))
                cursor.execute(('UPDATE proso_user_session SET location_id = {} WHERE location_id IN (' + ids_str + ')').format(new_id))
                cursor.execute('DELETE FROM proso_user_location WHERE ip_address = %s AND id != %s', [ip, new_id])
