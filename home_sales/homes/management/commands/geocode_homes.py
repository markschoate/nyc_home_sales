import time
from urllib2 import urlopen, Request
import urllib
import jsonlib
from django.core.management.base import BaseCommand
from home_sales.homes.models import Home, GeocodedHome

class Command(BaseCommand):
    help = "geocode address"

    def handle(self, *args, **options):
        if len(args) == 1:
            max_listings = int(args[0])
        else:
            max_listings = 10000
        count = 0
        previous_address = None
        previous_lat = None
        previous_lon = None
        for home in Home.objects.filter(latitude__isnull=False).iterator():
            if count > max_listings:
                break
            address = '%s, %s, %s %s' % (home.address, home.city, home.state, home.zip_code)
            geo_home, created = GeocodedHome.objects.get_or_create(home=home)
            
            if not address == previous_address:
                if created:
                    url_string = "http://maps.google.com/maps/api/geocode/json?address=%s&sensor=false" 
                    url = url_string % (urllib.quote_plus(address))
                    print 'Raw address: %s' % address
                    url_response = urlopen(url).read()
                    response = jsonlib.read(url_response)
                    if response['status'] == 'OK':
                        results = response['results']
                    
                        # Use first result, but flag it if there is more than 1
                        flagged = len(results)>1
                                     
                        lat = results[0]['geometry']['location']['lat']
                        lng = results[0]['geometry']['location']['lng']
                        
                        formatted_address = results[0]['formatted_address']
                        print 'Geocded address: %s' % formatted_address
                        print 'Lat/Lon: %s, %s' % (lat, lng)
                        geo_home.latitude=lat
                        geo_home.longitude=lng 
                        geo_home.formatted_address=formatted_address
                        geo_home.source=url_response
                        geo_home.flagged=flagged
                        geo_home.save()
                        previous_lat = lat
                        previous_lon = lng

                        previous_address = address
                        print 'Home saved...%s' % home.address
                        
                        count += 1
                        time.sleep(3)
                    else:
                        print 'Error: %s' % response['status']
                        print 'Exiting'
                        return
                else:
                    print 'Already exists.'
            else:
                if previous_lat and previous_lon:
                    print 'Duplicate lat/lon for %s' % home.address
                else:
                    print 'Skipping home %s' % home.address
                    