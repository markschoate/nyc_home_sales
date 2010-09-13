import traceback
from urllib2 import urlopen, Request

import django.utils.simplejson as simplejson
from django.conf import settings
from django.http import HttpResponse, Http404
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.template.loader import render_to_string

from home_sales.homes.models import Home, GeocodedHome

PAGE_SIZE = 10;

def index(request):
    return  render_to_response('homes/index.html',
        {
            'title': 'Manhattan Home Sales, 2009 through 2010'
        },
        context_instance=RequestContext(request)
    )

def search(request):
    try:
        filters = {}
        if request.GET.has_key('neighborhood'):
            filters['neighborhood__icontains'] = request.GET.get('neighborhood')
        if request.GET.has_key('zip_code'):
            filters['zip_code__iexact'] = request.GET.get('zip_code')
        if (request.GET.has_key('year_built_min') or
            request.GET.has_key('year_built_max')):
            yb_min = request.GET.get('year_built_min')
            yb_max = request.GET.get('year_built_max')
            if yb_min and yb_max:
                filters['year_built__range'] = (yb_min, yb_max)
            elif yb_min:
                filters['year_built__gt'] = yb_min
            else:
                filters['year_built__lt'] = yb_max
        if (request.GET.has_key('sale_price_min') or
            request.GET.has_key('sale_price_max')):
            price_min = request.GET.get('sale_price_min')
            price_max = request.GET.get('sale_price_max')
            if price_min and price_max:
                filters['sale_price__range'] = (price_min, price_max)
            elif price_min:
                filters['sale_price__gt'] = price_min
            else:
                filters['sale_price__lt'] = price_max

        page = int(request.GET.get('page', 1))
        start_index = _start_index(page, PAGE_SIZE)

        # Query the database
        total_size, discovery_response = _query(filters, start_index, PAGE_SIZE)

        # Process response
        item_ids = [str(i.id) for i in discovery_response if i]
        latlon_values = [(i.geocodedhome.latitude + ',' + i.geocodedhome.longitude) for i in discovery_response if i]

        response = {
            '_discovery': {
                'response': {
                    'page': page,
                    'pageSize': PAGE_SIZE,
                    'startIndex': start_index,
                    'totalSize': total_size,
                    'itemIds': item_ids,
                    'values': {'latlon': latlon_values}
                }
            },
        }

        _get_query_params(response, discovery_response, page, PAGE_SIZE, start_index, total_size)
        return HttpResponse(content=simplejson.dumps(response),
            content_type='application/json')
    except:
        stacktrace = traceback.format_exc()
        return HttpResponse(content=stacktrace, content_type='text/plain', status=500)

def results(request):
    item_list = request.GET.get('itemIds')
    page = int(request.GET.get('page', 1))
    total_size = int(request.GET.get('totalSize', 1))
    page_size = PAGE_SIZE
    start_index = _start_index(page, PAGE_SIZE)
    stop_index = start_index + min(page_size, total_size)
    if item_list:
        item_ids = item_list.split(',')
        if item_ids:
            homes = Home.objects.in_bulk(item_ids)
            response = []
            response.append(
                render_to_string('homes/results_summary.html', {
                    'page': page,
                    'total_size': total_size,
                    'page_size': page_size,
                    'start_index': start_index + 1,
                    'stop_index': stop_index
                })
            )
            response.append('<div>')
            for i, item_id in enumerate(item_ids):
                if homes.has_key(int(item_id)):
                    instance = homes[int(item_id)]
                    response.append(
                        render_to_string('homes/results.html', {'home':instance})
                    )
            response.append('</div>')
            return HttpResponse('\n'.join(response))

    return HttpResponse('No results were found')

def info_window(request, id):
    home = get_object_or_404(Home, pk=id)
    latitude = home.geocodedhome.latitude
    longitude = home.geocodedhome.longitude
    return  render_to_response('homes/info_window.html', {
        'home': home,
        'latitude': latitude,
        'longitude': longitude
        },
        context_instance=RequestContext(request)
    )

def _get_query_params(target, discovery_response, page, page_size, start_index, total_size):
    query_params = 'itemIds=%s' % ','.join([str(i.id) for i in discovery_response if i])
    query_params += '&page=%s' % page
    query_params += '&startIndex=%s' % start_index
    query_params += '&pageSize=%s' % page_size
    query_params += '&totalSize=%s' % total_size
    target['results_query_params'] = query_params

def _query(filters, start_index, page_size):
    if filters == {}:
        total_size = 0
        response = {}
    else:
        total_size = Home.objects.filter(**filters).count()
        response = Home.objects.filter(**filters)[start_index:start_index + min(page_size, total_size)]
    return (total_size, response)

def _start_index(page, page_size):
    if page > 0:
        start_index = (page - 1) * page_size
    else:
        start_index = 0
    return start_index
