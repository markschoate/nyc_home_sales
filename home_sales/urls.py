from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^home_sales/', include('home_sales.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs'
    # to INSTALLED_APPS to enable admin documentation:
    (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),
    url(r'^search/$', 'home_sales.homes.views.search', name='search'),
    url(r'^results/$', 'home_sales.homes.views.results', name='results'),
    url(r'^info_window/(?P<id>\d*)/$', 'home_sales.homes.views.info_window', name='info_window'),

    url(r'^$', 'home_sales.homes.views.index', name='home_index')

)

# In development, mirror static paths, but serve them up with django.views.static.serve
if settings.DEVELOPMENT:
   urlpatterns += patterns('',
      (r'^%s(?P<path>.*)$' % settings.MEDIA_URL[1:], 'django.views.static.serve',
        {'document_root': settings.MEDIA_ROOT, 'show_indexes': True}),
)
