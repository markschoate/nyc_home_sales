from django.contrib import admin

from home_sales.homes.models import Home, GeocodedHome

class GeocodedHomeInline(admin.StackedInline):
    model = GeocodedHome
    max_num = 1

class HomeAdmin(admin.ModelAdmin):
    list_display = ('address', 'city', 'state', 'zip_code', 'sale_price')
    list_filter = ('neighborhood',)
    search_fields = ('neighborhood', 'address', 'zip_code')
    date_hierarchy = ('sale_date')
    inlines = (GeocodedHomeInline,)

class GeocodedHomeAdmin(admin.ModelAdmin):
    list_display = ('formatted_address', 'latitude', 'longitude',)
    list_filter = ('flagged',)
    search_fields = ('formatted_address', 'source')

admin.site.register(Home, HomeAdmin)
admin.site.register(GeocodedHome, GeocodedHomeAdmin)
