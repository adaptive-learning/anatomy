from django.core.management.base import BaseCommand
from proso_flashcards.models import Context
from django.conf import settings
import os
from wand.image import Image, Color
from clint.textui import progress
import base64
import json


class Command(BaseCommand):

    def handle(self, *args, **options):
        self.tiny_thumbnails = {}

        contexts = Context.objects.filter(lang='cs')
        print("Generating thumbnails")
        for c in progress.bar(contexts, every=max(1, len(contexts) // 100)):
            self.generate_thumbnail(c)

        path = "anatomy/static/img/category/"
        for image in os.listdir(path):
            if image.endswith('.png'):
                self.add_to_tiny_thumbnails(path + image, image, '/static/img/category/')

        thumbnails_json_file = 'anatomy/static/dist/thumbnails.json'
        with open(thumbnails_json_file, 'w') as outfile:
            json.dump(self.tiny_thumbnails, outfile)
        print("Generated to file '%s'" % thumbnails_json_file)

    def add_to_tiny_thumbnails(self, file_path, file_name, online_path):
        with Image(filename=file_path) as img:
            online_path = online_path + file_name
            img.transform(resize='16x16')
            tmp_path = file_path + '.tpm'
            img.save(filename=tmp_path)
            img.save(filename=tmp_path)
            with open(tmp_path, "rb") as image_file:
                encoded_image = base64.b64encode(image_file.read())
                self.tiny_thumbnails[online_path] = encoded_image.decode("utf-8")
            os.remove(tmp_path)

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
                self.add_to_tiny_thumbnails(new_path, file_name, '/media/tile-thumbs/')
