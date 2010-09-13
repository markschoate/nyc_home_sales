import os, csv
from django.core.management.base import BaseCommand
from home_sales.homes.models import Home

class Command(BaseCommand):
    help = "Import source .csv file from NYC home sales data."

    def handle(self, *args, **options):
        if len(args) == 1:
            fname = args[0]
            if not os.path.exists(fname): return
        else:
            fname = "data/rollingsales_manhattan.csv"
            
        print 'Deleting old records...'
        Home.objects.all().delete()
        
        data = csv.DictReader(open(fname, 'r'))
        for row in data:
            new_dict = dict()
            for k, v in row.items():
                if k == 'sale_price':
                    new_dict[k] = v.strip().replace(',', '').replace('$', '')
                elif k == 'land_square_feet' or k == 'gross_square_feet':
                    new_dict[k] = v.strip().replace(',', '')
                elif k == 'sale_date':
                    if '/' in v:
                        parts = v.split('/')
                        new_dict[k] = '%s-%s-%s' % (parts[2], parts[0], parts[1])
                    else:
                        new_dict[k] = v
                else:
                    stripped = v.strip()
                    if not stripped == '':
                        new_dict[k] = stripped
                    
            new_dict['city'] = 'New York'
            new_dict['state'] = 'NY'
            print 'Saving... %s' % new_dict.get('address', 'No address available')
            Home.objects.create(**new_dict) 

        