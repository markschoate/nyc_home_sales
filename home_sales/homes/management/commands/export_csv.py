import sys
import csv
from django.core.management.base import BaseCommand
from django.db.models import get_model

from home_sales.homes.models import Home

class Command(BaseCommand):
    help = "Export source .csv file from NYC home sales data."

    def handle(self, *args, **options):
        if len(args) == 1:
            model = args[0]
        else:
            return 'Need model.'
    
        mod_obj = get_model('homes', model)
        
        writer = csv.writer(sys.stdout)
        headers = []
        for field in mod_obj._meta.fields:
            headers.append(field.name)
            
        writer.writerow(headers)
        # Write data to CSV file
        for obj in mod_obj.objects.iterator():
            row = []
            for field in headers:
                if field in headers:
                    val = getattr(obj, field)
                    if callable(val):
                        val = val()
                    row.append(val)
            writer.writerow(row)

