"""


"""
import os

from django.core.management.base import BaseCommand
from fabric.operations import local

class Command(BaseCommand):
    help = ""

    def handle(self, *args, **options):
        """
        """
        local('/usr/bin/java -cp ./media_compressor/tools/mediacompressor-70b1f96.jar -jar ./media_compressor/tools/mediacompressor-70b1f96.jar --config=./media_compressor/media.yml', capture=False)
