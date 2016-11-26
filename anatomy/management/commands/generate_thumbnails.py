from django.core.management.base import BaseCommand
from proso_flashcards.models import Context
from django.conf import settings
import os
from wand.image import Image, Color
from clint.textui import progress


class Command(BaseCommand):

    def handle(self, *args, **options):
        contexts = Context.objects.filter(lang='cs')
        print("Generating thumbnails")
        for c in progress.bar(contexts, every=max(1, len(contexts) // 100)):
            self.generate_thumbnail(c)

    def generate_thumbnail(self, context):
        file_name = context.identifier + '.png'
        path = os.path.join(settings.MEDIA_ROOT, 'thumbs', file_name)
        dest_dir = os.path.join(settings.MEDIA_ROOT, 'tile-thumbs')
        new_path = os.path.join(dest_dir, file_name)
        if not os.path.exists(dest_dir):
                os.makedirs(dest_dir)
        if os.path.isfile(path):
            with Image(filename=path) as img:
                img.transform(resize='255x255')
                border_width = int((320 - img.size[0]) / 2)
                border_height = int((320 - img.size[1]) / 2)
                img.border(color=Color('transparent'),
                           width=border_width,
                           height=border_height)
                img.alpha = True
                img.modulate(saturation=0.5)
                img.save(filename=new_path)
