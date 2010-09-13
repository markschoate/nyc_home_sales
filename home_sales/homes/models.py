from django.db import models

# Create your models here.
class Home(models.Model):
    borough = models.SmallIntegerField(blank=True, null=True)
    neighborhood = models.CharField(max_length=128)
    building_class_category = models.CharField(max_length=128)
    tax_class_at_present = models.CharField(max_length=2)
    block = models.CharField(max_length=3)
    lot = models.CharField(max_length=4)
    easement = models.CharField(max_length=8)
    building_class_at_present = models.CharField(max_length=2)
    address = models.CharField(max_length=128)
    city = models.CharField(max_length=40)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    residential_units = models.SmallIntegerField(blank=True, null=True)
    commercial_units = models.SmallIntegerField(blank=True, null=True)
    total_units = models.SmallIntegerField(blank=True, null=True)
    land_square_feet = models.CharField(max_length=128)
    gross_square_feet = models.CharField(max_length=128)
    year_built = models.SmallIntegerField(blank=True, null=True)
    tax_class_at_time_of_sale = models.CharField(max_length=2)
    building_class_at_time_of_sale = models.CharField(max_length=2)
    sale_price = models.IntegerField(blank=True, null=True)
    sale_date = models.DateField(blank=True, null=True)

    def __unicode__(self):
        return self.address;

class GeocodedHome(models.Model):
    home = models.OneToOneField(Home)
    latitude = models.CharField(max_length=20)
    longitude = models.CharField(max_length=20)
    formatted_address = models.TextField()
    source = models.TextField()
    flagged = models.BooleanField(default=False)

    def __unicode__(self):
        return self.home.address;
