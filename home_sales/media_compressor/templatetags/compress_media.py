import os, yaml, logging
from django import template
from django.conf import settings

register = template.Library()

logger = logging.getLogger(__file__)

RENDER_OPTS = ('min', 'concat', 'debug')

class CompressMedia(template.Node):
    def __init__(self, group, render_type):
        self.current_group = group
        self.render_type = render_type
        self.config = self.get_media_config()

    def get_media_config(self):
        """TODO: Template fragment should be cached."""
        media_config = None;
        try:
            f = open(settings.MEDIA_YML, 'r')
            media_config = yaml.load(f)
            f.close()
        except Exception, e:
            logger.error('Compress Media Exception: %s' % e)
        return media_config

    def render(self, context):
        links = []

        # in debug mode, upload media configuration with each request
        if settings.DEBUG:
            self.config = self.get_media_config()

        groups = self.config.get('groups')

        if not groups:
            return ''

        for group in groups:
            if group.get('groupName') == self.current_group:
                if self.render_type == 'debug':
                    for name in group.get('sourceFileNames'):
                        if group.get('mediaType') == 'js':
                            links.append(u'<script type="text/javascript" src="%s"></script>'
                                % (os.path.join(settings.MEDIA_URL, name)))
                        else:
                            links.append(u'<link rel="stylesheet" type="text/css" href="%s" />'
                                % (os.path.join(settings.MEDIA_URL, name)))
                else:
                    if self.render_type == 'concat':
                        output_name = group.get('outputFileName')
                    else:
                        output_name = group.get('outputFileNameMinified')
                    media_root = self.config.get('mediaRootDir')
                    output_dir = self.config.get('outputDir')
                    if group.get('mediaType') == 'js':
                        links.append(u'<script type="text/javascript" src="/%s"></script>'
                            % (os.path.join(media_root, output_dir, output_name)))
                    else:
                        links.append(u'<link rel="stylesheet" type="text/css" href="/%s" />'
                             % (os.path.join(media_root, output_dir, output_name)))
                break
        return '\n'.join(links)

@register.tag
def compress_media(parser, token):
    """
    {% compress_media group debug|min|concat %}
    """

    tag_args = token.split_contents()

    if len(tag_args) < 2:
        raise template.TemplateSyntaxError("%r tag requires at least one argument" % tag_args[0])

    media_group = None
    render_type = None
    media_group = tag_args[1]
    if len(tag_args) == 3:
        render = tag_args[2]
        if render in RENDER_OPTS:
            render_type = render
    if render_type is None:
        if settings.DEBUG:
            render_type = RENDER_OPTS[2]
        else:
            render_type = RENDER_OPTS[0]
    try:
        return CompressMedia(media_group, render_type)
    except Exception, e:
        logger.error(e)
