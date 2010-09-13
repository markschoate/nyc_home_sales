/**
 * history 1.2 - Plugin for jQuery
 *
 *
 * IE8 is supporting onhashchange event
 * http://msdn.microsoft.com/en-us/library/cc288209(VS.85).aspx
 *
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Depends:
 *   jquery.js
 *
 *  Copyright (c) 2008 Oleg Slobodskoi (ajaxsoft.de)
 */

(function ($, window, top) {
    var instance;

    $.history = function (method, param) {
        if (typeof method === 'function') {
            param = method;
            method = 'bind';
        }
        // bind and unbind methods need a callback function
        else if (/bind|unbind/.test(method) && !$.isFunction(param)) {
            return;
        }

        if (!instance) {
            instance = new Hist();
            instance.init();
        }

        if (method !== 'init') {
            instance[method](param);
        }
    };

    function Hist() {
        var self = this,
            IE67 = $.browser.msie && parseInt($.browser.version, 10) < 8,
            IE8 = $.browser.msie && parseInt($.browser.version, 10) >= 8,
            $iframe,
            $wnd = $(window),
            stop = false;

        self.value = top.location.hash.substr(1);

        this.init = function () {
            if (IE8) {
                $wnd.bind('hashchange', IE8Handler);
            } else if (IE67) {
                initIframe();
            } else {
                (function () {
                    if (stop) {
                        return;
                    }
                    if (top.location.hash.substr(1) !== self.value) {
                        changed(top.location.hash);
                    }
                    setTimeout(arguments.callee, 50);
                }());
            }
        };

        this.destroy = function () {
            // stop timeout
            stop = true;
            // remove iframe for IE6-7
            if ($iframe) {
                $iframe.remove();
            }
            // unbind all events
            $wnd.unbind('hashchanged');
            // remove the reference to the instance
            instance = null;
            // unbind event for IE8
            if (IE8) {
                $wnd.unbind('hashchange', IE8Handler);
            }
        };

        this.bind = function (callback) {
            $wnd.bind('hashchanged', callback);
        };

        this.unbind = function (callback) {
            $wnd.unbind('hashchanged', callback);
        };

        this.add = function (value) {
            top.location.hash = value;
        };

        this.forward = function () {
            history.go(1);
        };

        this.back = function () {
            history.go(-1);
        };

        /**
         * Only for IE6-7
         * Check if iframe hash the same as document
         */
        function initIframe() {
            $iframe = $iframe || $('<iframe style="display: none;" class="x-history-iframe"/>').appendTo(document.body);
            // if document is not ready, access to the contentWindow of the iframe is not immediately available
            try {
                var ignored = $iframe[0].contentWindow;
            } catch (e) {
                setTimeout(arguments.callee, 50);
                return;
            }

         // get the document of the iframe
            function iDoc() {
                return $iframe[0].contentWindow.document;
            }

            var iHash = iDoc().location.hash,
                hash = top.location.hash,
                iHashNew, hashNew;

            (function () {
                if (stop) {
                    return;
                }
                iHashNew = iDoc().location.hash;
                hashNew = top.location.hash;

                // changed using navigation buttons
                if (iHashNew !== iHash) {
                    iHash = iHashNew;
                    hash = iHash;
                    top.location.hash = changed(iHash);
                // changed using link or add method
                } else if (hashNew !== hash) {
                    hash = hashNew;
                    updateIFrame(hash);
                }
                setTimeout(arguments.callee, 50);
            }());

            // save value to the iframe
            function updateIFrame(value) {
                iDoc().open();
                iDoc().close();
                iDoc().location.hash = value;
            }
        }

        /**
         * hash was changed - do something
         * @param {String} value - '#value'
         */
        function changed(value) {
            self.value = value.substr(1);
            // call all callbacks
            $.event.trigger('hashchanged', [self]);
            return self.value;
        }

        function IE8Handler(e) {
            changed(top.location.hash);
        }


    }
}(jQuery, window, top));
/**
 * This jQuery plugin displays pagination links inside the selected elements.
 * Modified by Transparensee to pass jsLint and wrap in a function that takes jQuery as $.
 *
 * @author Gabriel Birke (birke *at* d-scribe *dot* de)
 * @version 1.1
 * @param {int} maxentries Number of entries to paginate
 * @param {Object} opts Several options (see README for documentation)
 * @return {Object} jQuery Object
 */
(function ($) {
    jQuery.fn.pagination = function (maxentries, opts) {
        opts = jQuery.extend({
            items_per_page: 10,
            num_display_entries: 10,
            current_page: 0,
            num_edge_entries: 0,
            link_to: "#",
            prev_text: "Prev",
            next_text: "Next",
            ellipse_text: "...",
            prev_show_always: true,
            next_show_always: true,
            callback: function () {
                return false;
            }
        }, opts || {});

        return this.each(function () {
            /**
             * Calculate the maximum number of pages
             */
            function numPages() {
                return Math.ceil(maxentries / opts.items_per_page);
            }

            /**
             * Calculate start and end point of pagination links depending on
             * current_page and num_display_entries.
             * @return {Array}
             */
            function getInterval()  {
                var ne_half = Math.ceil(opts.num_display_entries / 2);
                var np = numPages();
                var upper_limit = np - opts.num_display_entries;
                var start = current_page > ne_half ? Math.max(Math.min(current_page - ne_half, upper_limit), 0) : 0;
                var end = current_page > ne_half ? Math.min(current_page + ne_half, np) : Math.min(opts.num_display_entries, np);
                return [start, end];
            }

            /**
             * This is the event handling function for the pagination links.
             * @param {int} page_id The new page number
             */
            function pageSelected(page_id, evt) {
                current_page = page_id;
                drawLinks();
                var continuePropagation = opts.callback(page_id, panel);
                if (!continuePropagation) {
                    if (evt.stopPropagation) {
                        evt.stopPropagation();
                    }
                    else {
                        evt.cancelBubble = true;
                    }
                }
                return continuePropagation;
            }

            /**
             * This function inserts the pagination links into the container element
             */
            function drawLinks() {
                panel.empty();
                var interval = getInterval();
                var np = numPages();
                // This helper function returns a handler function that calls pageSelected with the right page_id
                var getClickHandler = function (page_id) {
                    return function (evt) {
                        return pageSelected(page_id, evt);
                    };
                };
                // Helper function for generating a single link (or a span tag if it'S the current page)
                var appendItem = function (page_id, appendopts) {
                    page_id = page_id < 0 ? 0 : (page_id < np ? page_id : np - 1); // Normalize page id to sane value
                    appendopts = jQuery.extend({text: page_id + 1, classes: ""}, appendopts || {});
                    var lnk;
                    if (page_id === current_page) {
                        lnk = $("<span class='current'>" + (appendopts.text) + "</span>");
                    }
                    else
                    {
                        lnk = $("<a>" + (appendopts.text) + "</a>")
                            .bind("click", getClickHandler(page_id))
                            .attr('href', opts.link_to.replace(/__id__/, page_id));


                    }
                    if (appendopts.classes) {
                        lnk.addClass(appendopts.classes);
                    }
                    panel.append(lnk);
                };
                // Generate "Previous"-Link
                if (opts.prev_text && (current_page > 0 || opts.prev_show_always)) {
                    appendItem(current_page - 1, {text: opts.prev_text, classes: "prev"});
                }
                // Generate starting points
                var i;
                if (interval[0] > 0 && opts.num_edge_entries > 0)
                {
                    var end = Math.min(opts.num_edge_entries, interval[0]);
                    for (i = 0; i < end; i++) {
                        appendItem(i);
                    }
                    if (opts.num_edge_entries < interval[0] && opts.ellipse_text)
                    {
                        jQuery("<span>" + opts.ellipse_text + "</span>").appendTo(panel);
                    }
                }
                // Generate interval links
                for (i = interval[0]; i < interval[1]; i++) {
                    appendItem(i);
                }
                // Generate ending points
                if (interval[1] < np && opts.num_edge_entries > 0)
                {
                    if (np - opts.num_edge_entries > interval[1] && opts.ellipse_text)
                    {
                        jQuery("<span>" + opts.ellipse_text + "</span>").appendTo(panel);
                    }
                    var begin = Math.max(np - opts.num_edge_entries, interval[1]);
                    for (i = begin; i < np; i++) {
                        appendItem(i);
                    }

                }
                // Generate "Next"-Link
                if (opts.next_text && (current_page < np - 1 || opts.next_show_always)) {
                    appendItem(current_page + 1, {text: opts.next_text, classes: "next"});
                }
            }

            // Extract current_page from options
            var current_page = opts.current_page;
            // Create a sane value for maxentries and items_per_page
            maxentries = (!maxentries || maxentries < 0) ? 1 : maxentries;
            opts.items_per_page = (!opts.items_per_page || opts.items_per_page < 0) ? 1 : opts.items_per_page;
            // Store DOM element for easy access from all inner functions
            var panel = jQuery(this);
            // Attach control functions to the DOM element
            this.selectPage = function (page_id) {
                pageSelected(page_id);
            };
            this.prevPage = function () {
                if (current_page > 0) {
                    pageSelected(current_page - 1);
                    return true;
                }
                else {
                    return false;
                }
            };
            this.nextPage = function () {
                if (current_page < numPages() - 1) {
                    pageSelected(current_page + 1);
                    return true;
                }
                else {
                    return false;
                }
            };
            // When all initialisation is done, draw the links
            drawLinks();
        });
    };
}(jQuery));


/* Copyright (c) 2006 Brandon Aaron (http://brandonaaron.net)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Modified by Transparensee to pass jsLint.
 *
 * $LastChangedDate: 2007-07-21 18:44:59 -0500 (Sat, 21 Jul 2007) $
 * $Rev: 2446 $
 *
 * Version 2.1.1
 */

(function ($) {

/**
 * The bgiframe is chainable and applies the iframe hack to get
 * around zIndex issues in IE6. It will only apply itself in IE6
 * and adds a class to the iframe called 'bgiframe'. The iframe
 * is appeneded as the first child of the matched element(s)
 * with a tabIndex and zIndex of -1.
 *
 * By default the plugin will take borders, sized with pixel units,
 * into account. If a different unit is used for the border's width,
 * then you will need to use the top and left settings as explained below.
 *
 * NOTICE: This plugin has been reported to cause perfromance problems
 * when used on elements that change properties (like width, height and
 * opacity) a lot in IE6. Most of these problems have been caused by
 * the expressions used to calculate the elements width, height and
 * borders. Some have reported it is due to the opacity filter. All
 * these settings can be changed if needed as explained below.
 *
 * @example $('div').bgiframe();
 * @before <div><p>Paragraph</p></div>
 * @result <div><iframe class="bgiframe".../><p>Paragraph</p></div>
 *
 * @param Map settings Optional settings to configure the iframe.
 * @option String|Number top The iframe must be offset to the top
 *         by the width of the top border. This should be a negative
 *      number representing the border-top-width. If a number is
 *         is used here, pixels will be assumed. Otherwise, be sure
 *        to specify a unit. An expression could also be used.
 *         By default the value is "auto" which will use an expression
 *         to get the border-top-width if it is in pixels.
 * @option String|Number left The iframe must be offset to the left
 *         by the width of the left border. This should be a negative
 *      number representing the border-left-width. If a number is
 *         is used here, pixels will be assumed. Otherwise, be sure
 *        to specify a unit. An expression could also be used.
 *         By default the value is "auto" which will use an expression
 *         to get the border-left-width if it is in pixels.
 * @option String|Number width This is the width of the iframe. If
 *        a number is used here, pixels will be assume. Otherwise, be sure
 *         to specify a unit. An experssion could also be used.
 *        By default the value is "auto" which will use an experssion
 *         to get the offsetWidth.
 * @option String|Number height This is the height of the iframe. If
 *        a number is used here, pixels will be assume. Otherwise, be sure
 *         to specify a unit. An experssion could also be used.
 *        By default the value is "auto" which will use an experssion
 *         to get the offsetHeight.
 * @option Boolean opacity This is a boolean representing whether or not
 *         to use opacity. If set to true, the opacity of 0 is applied. If
 *        set to false, the opacity filter is not applied. Default: true.
 * @option String src This setting is provided so that one could change
 *        the src of the iframe to whatever they need.
 *        Default: "javascript:false;"
 *
 * @name bgiframe
 * @type jQuery
 * @cat Plugins/bgiframe
 * @author Brandon Aaron (brandon.aaron@gmail.com || http://brandonaaron.net)
 */
    $.fn.bgIframe = $.fn.bgiframe = function (s) {
        // This is only for IE6
        if ($.browser.msie && /6\.0/.test(navigator.userAgent)) {
            var scriptType = 'javascript';
            s = $.extend({
                top     : 'auto', // auto == .currentStyle.borderTopWidth
                left    : 'auto', // auto == .currentStyle.borderLeftWidth
                width   : 'auto', // auto == offsetWidth
                height  : 'auto', // auto == offsetHeight
                opacity : true,
                src     : scriptType + ':false;'
            }, s || {});
            var prop = function (n) {
                return n && n.constructor === Number ? n + 'px' : n;
            };
            var html = '<iframe class="bgiframe"frameborder="0"tabindex="-1"src="' + s.src + '"' +
                           'style="display:block;position:absolute;z-index:-1;' +
                               (s.opacity !== false ? 'filter:Alpha(Opacity=\'0\');' : '') +
                               'top:' + (s.top === 'auto' ? 'expression(((parseInt(this.parentNode.currentStyle.borderTopWidth)||0)*-1)+\'px\')' : prop(s.top)) + ';' +
                               'left:' + (s.left === 'auto' ? 'expression(((parseInt(this.parentNode.currentStyle.borderLeftWidth)||0)*-1)+\'px\')' : prop(s.left)) + ';' +
                               'width:' + (s.width === 'auto' ? 'expression(this.parentNode.offsetWidth+\'px\')' : prop(s.width)) + ';' +
                               'height:' + (s.height === 'auto' ? 'expression(this.parentNode.offsetHeight+\'px\')' : prop(s.height)) + ';' +
                        '"/>';
            return this.each(function () {
                if ($('> iframe.bgiframe', this).length === 0) {
                    this.insertBefore(document.createElement(html), this.firstChild);
                }
            });
        }
        return this;
    };

}(jQuery));
/**
 * jQuery Templates
 *
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Written by: Stan Lemon <stanlemon@mac.com>
 *
 * Based off of the Ext.Template library, available at:
 * http://www.extjs.com
 *
 * This library provides basic templating functionality, allowing for macro-based
 * templates within jQuery.
 *
 * Basic Usage:
 *
 * var t = $.template('<div id="foo">Hello ${name}, how are you ${question}?  I am ${me:substr(0,10)}</div>');
 *
 * $(selector).append( t , {
 *     name: 'Stan',
 *     question: 'feeling',
 *     me: 'doing quite well myself, thank you very much!'
 * });
 *
 * Requires: jQuery 1.2+
 *
 *
 * @todo    Add callbacks to the DOM manipulation methods, so that events can be bound
 *          to template nodes after creation.
 */
(function ($) {

    /**
     * Create a New Template
     */
    $.template = function (html, options) {
        return new $.template.instance(html, options);
    };

    /**
     * Template constructor - Creates a new template instance.
     *
     * @param   html    The string of HTML to be used for the template.
     * @param   options An object of configurable options.  Currently
     *          you can toggle compile as a boolean value and set a custom
     *          template regular expression on the property regx by
     *          specifying the key of the regx to use from the regx object.
     */
    $.template.instance = function (html, options) {
        // If a custom regular expression has been set, grab it from the regx object
        if (options && options.regx) {
            options.regx = this.regx[options.regx];
        }

        this.options = $.extend({
            compile:        false,
            regx:           this.regx.standard
        }, options || {});

        this.html = html;

        if (this.options.compile) {
            this.compile();
        }
        this.isTemplate = true;
    };

    /**
     * Regular Expression for Finding Variables
     *
     * The default pattern looks for variables in JSP style, the form of: ${variable}
     * There are also regular expressions available for ext-style variables and
     * jTemplate style variables.
     *
     * You can add your own regular expressions for variable ussage by doing.
     * $.extend({ $.template.re , {
     *     myvartype: /...../g
     * }
     *
     * Then when creating a template do:
     * var t = $.template("<div>...</div>", { regx: 'myvartype' });
     */
    $.template.regx = $.template.instance.prototype.regx = {
        /*jslint regexp: false */
        jsp:        /\$\{([\w\-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g,
        ext:        /\{([\w\-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g,
        jtemplates: /\{\{([\w\-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}\}/g
    };

    /**
     * Set the standard regular expression to be used.
     */
    $.template.regx.standard = $.template.regx.jsp;

    /**
     * Variable Helper Methods
     *
     * This is a collection of methods which can be used within the variable syntax, ie:
     * ${variable:substr(0,30)} Which would only print a substring, 30 characters in length
     * begining at the first character for the variable named "variable".
     *
     * A basic substring helper is provided as an example of how you can define helpers.
     * To add more helpers simply do:
     * $.extend( $.template.helpers , {
     *   sampleHelper: function() { ... }
     * });
     */
    $.template.helpers = $.template.instance.prototype.helpers = {
        substr : function (value, start, length) {
            return String(value).substr(start, length);
        }
    };


    /**
     * Template Instance Methods
     */
    $.extend($.template.instance.prototype, {

        /**
         * Apply Values to a Template
         *
         * This is the macro-work horse of the library, it receives an object
         * and the properties of that objects are assigned to the template, where
         * the variables in the template represent keys within the object itself.
         *
         * @param   values  An object of properties mapped to template variables
         */
        apply: function (values) {
            if (this.options.compile) {
                return this.compiled(values);
            } else {
                var tpl = this;
                var fm = this.helpers;

                var fn = function (m, name, format, args) {
                    if (format) {
                        if (format.substr(0, 5) === "this.") {
                            return tpl.call(format.substr(5), values[name], values);
                        } else {
                            if (args) {
                                // quoted values are required for strings in compiled templates,
                                // but for non compiled we need to strip them
                                // quoted reversed for jsmin
                                var re = /^\s*['"](.*)["']\s*$/;
                                args = args.split(',');

                                for (var i = 0, len = args.length; i < len; i++) {
                                    args[i] = args[i].replace(re, "$1");
                                }
                                args = [values[name]].concat(args);
                            } else {
                                args = [values[name]];
                            }

                            return fm[format].apply(fm, args);
                        }
                    } else {
                        return values[name] !== undefined ? values[name] : "";
                    }
                };

                return this.html.replace(this.options.regx, fn);
            }
        },

        /**
         * Compile a template for speedier usage
         */
        compile: function () {
            var sep = $.browser.mozilla ? "+" : ",";
            var fm = this.helpers;

            var fn = function (m, name, format, args) {
                if (format) {
                    args = args ? ',' + args : "";

                    if (format.substr(0, 5) !== "this.") {
                        format = "fm." + format + '(';
                    } else {
                        format = 'this.call("' + format.substr(5) + '", ';
                        args = ", values";
                    }
                } else {
                    args = '';
                    format = "(values['" + name + "'] == undefined ? '' : ";
                }
                return "'" + sep + format + "values['" + name + "']" + args + ")" + sep + "'";
            };

            var body;

            if ($.browser.mozilla) {
                body = "this.compiled = function(values){ return '" +
                       this.html.replace(/\\/g, '\\\\').replace(/(\r\n|\n)/g, '\\n').replace(/'/g, "\\'").replace(this.options.regx, fn) +
                        "';};";
            } else {
                body = ["this.compiled = function(values){ return ['"];
                body.push(this.html.replace(/\\/g, '\\\\').replace(/(\r\n|\n)/g, '\\n').replace(/'/g, "\\'").replace(this.options.regx, fn));
                body.push("'].join('');};");
                body = body.join('');
            }
            /*jslint evil: true */
            eval(body);
            return this;
        }
    });


    /**
     * Save a reference in this local scope to the original methods which we're
     * going to overload.
     **/
    var $_old = {
        domManip: $.fn.domManip,
        text: $.fn.text,
        html: $.fn.html
    };

    /**
     * Overwrite the domManip method so that we can use things like append() by passing a
     * template object and macro parameters.
     */
    $.fn.domManip = function (args, table, reverse, callback) {
        if (args[0].isTemplate) {
            // Apply the template and it's arguments...
            args[0] = args[0].apply(args[1]);
            // Get rid of the arguements, we don't want to pass them on
            delete args[1];
        }

        // Call the original method
        var r = $_old.domManip.apply(this, arguments);

        return r;
    };

    /**
     * Overwrite the html() method
     */
    $.fn.html = function (value, o) {
        if (value && value.isTemplate) {
            value = value.apply(o);
        }

        var r = $_old.html.apply(this, [value]);

        return r;
    };

    /**
     * Overwrite the text() method
     */
    $.fn.text = function (value, o) {
        if (value && value.isTemplate) {
            value = value.apply(o);
        }

        var r = $_old.text.apply(this, [value]);

        return r;
    };

}(jQuery));
/**
 *
 * jquery.sparkline.js
 *
 * v1.4.3 (c) Splunk, Inc Contact: Gareth Watts (gareth@splunk.com)
 * http://omnipotent.net/jquery.sparkline/
 *
 * Generates inline sparkline charts from data supplied either to the method or
 * inline in HTML
 *
 * Compatible with Internet Explorer 6.0+ and modern browsers equipped with the
 * canvas tag (Firefox 2.0+, Safari, Opera, etc)
 *
 * License: New BSD License
 *
 * Copyright (c) 2009, Splunk Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer. * Redistributions in
 * binary form must reproduce the above copyright notice, this list of
 * conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution. * Neither the name of Splunk Inc
 * nor the names of its contributors may be used to endorse or promote products
 * derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *
 * Usage: $(selector).sparkline(values, options)
 *
 * If values is undefined or set to 'html' then the data values are read from
 * the specified tag:
 * <p>
 * Sparkline: <span class="sparkline">1,4,6,6,8,5,3,5</span>
 * </p>
 * $('.sparkline').sparkline(); There must be no spaces in the enclosed data set
 *
 * Otherwise values must be an array of numbers or null values
 * <p>
 * Sparkline: <span id="sparkline1">This text replaced if the browser is
 * compatible</span>
 * </p>
 * $('#sparkline1').sparkline([1,4,6,6,8,5,3,5])
 * $('#sparkline2').sparkline([1,4,6,null,null,5,3,5])
 *
 * For line charts, x values can also be specified:
 * <p>
 * Sparkline: <span class="sparkline">1:1,2.7:4,3.4:6,5:6,6:8,8.7:5,9:3,10:5</span>
 * </p>
 * $('#sparkline1').sparkline([ [1,1], [2.7,4], [3.4,6], [5,6], [6,8], [8.7,5],
 * [9,3], [10,5] ])
 *
 * Supported options: lineColor - Color of the line used for the chart fillColor -
 * Color used to fill in the chart - Set to '' or false for a transparent chart
 * width - Width of the chart - Defaults to 3 times the number of values in
 * pixels height - Height of the chart - Defaults to the height of the
 * containing element chartRangeMin - Specify the minimum value to use for the
 * range of the chart - Defaults to the minimum value supplied chartRangeMax -
 * Specify the maximum value to use for the range of the chart - Defaults to the
 * maximum value supplied composite - If true then don't erase any existing
 * chart attached to the tag, but draw another chart over the top - Note that
 * width and height are ignored if an existing chart is detected.
 *
 * There are 7 types of sparkline, selected by supplying a "type" option of
 * 'line' (default), 'bar', 'tristate', 'bullet', 'discrete', 'pie' or 'box'
 * line - Line chart. Options: spotColor - Set to '' to not end each line in a
 * circular spot minSpotColor - If set, color of spot at minimum value
 * maxSpotColor - If set, color of spot at maximum value spotRadius - Radius in
 * pixels lineWidth - Width of line in pixels normalRangeMin normalRangeMax - If
 * set draws a filled horizontal bar between these two values marking the
 * "normal" or expected range of values normalRangeColor - Color to use for the
 * above bar defaultPixelsPerValue - Defaults to 3 pixels of width for each
 * value in the chart
 *
 * bar - Bar chart. Options: barColor - Color of bars for postive values
 * negBarColor - Color of bars for negative values barWidth - Width of bars in
 * pixels colorMap - Optional mappnig of values to colors to override the
 * *BarColor values above barSpacing - Gap between bars in pixels zeroAxis -
 * Centers the y-axis around zero if true
 *
 * tristate - Charts values of win (>0), lose (<0) or draw (=0) posBarColor -
 * Color of win values negBarColor - Color of lose values zeroBarColor - Color
 * of draw values barWidth - Width of bars in pixels barSpacing - Gap between
 * bars in pixels colorMap - Optional mappnig of values to colors to override
 * the *BarColor values above
 *
 * discrete - Options: lineHeight - Height of each line in pixels - Defaults to
 * 30% of the graph height thesholdValue - Values less than this value will be
 * drawn using thresholdColor instead of lineColor thresholdColor
 *
 * bullet - Values for bullet graphs msut be in the order: target, performance,
 * range1, range2, range3, ... options: targetColor - The color of the vertical
 * target marker targetWidth - The width of the target marker in pixels
 * performanceColor - The color of the performance measure horizontal bar
 * rangeColors - Colors to use for each qualitative range background color
 *
 * pie - Pie chart. Options: sliceColors - An array of colors to use for pie
 * slices offset - Angle in degrees to offset the first slice - Try -90 or +90
 *
 * box - Box plot. Options: raw - Set to true to supply pre-computed plot points
 * as values values should be: low_outlier, low_whisker, q1, median, q3,
 * high_whisker, high_outlier When set to false you can supply any number of
 * values and the box plot will be computed for you. Default is false.
 * showOutliers - Set to true (default) to display outliers as circles
 * outlierIRQ - Interquartile range used to determine outliers. Default 1.5
 * boxLineColor - Outline color of the box boxFillColor - Fill color for the box
 * whiskerColor - Line color used for whiskers outlierLineColor - Outline color
 * of outlier circles outlierFillColor - Fill color of the outlier circles
 * spotRadius - Radius of outlier circles medianColor - Line color of the median
 * line target - Draw a target cross hair at the supplied value (default
 * undefined)
 *
 *
 *
 * Examples: $('#sparkline1').sparkline(myvalues, { lineColor: '#f00',
 * fillColor: false }); $('.barsparks').sparkline('html', { type:'bar',
 * height:'40px', barWidth:5 }); $('#tristate').sparkline([1,1,-1,1,0,0,-1], {
 * type:'tristate' }): $('#discrete').sparkline([1,3,4,5,5,3,4,5], {
 * type:'discrete' }); $('#bullet').sparkline([10,12,12,9,7], { type:'bullet'
 * }); $('#pie').sparkline([1,1,2], { type:'pie' });
 */

(function ($) {

    // Provide a cross-browser interface to a few simple drawing primitives
    $.fn.simpledraw = function (width, height, use_existing) {
        if (use_existing && this[0].vcanvas) {
            return this[0].vcanvas;
        }
        if (width === undefined) {
            width = $(this).innerWidth();
        }
        if (height === undefined) {
            height = $(this).innerHeight();
        }
        if ($.browser.hasCanvas) {
            return new Vcanvas_canvas(width, height, this);
        } else if ($.browser.msie) {
            return new Vcanvas_vml(width, height, this);
        } else {
            return false;
        }
    };

    var pending = [];

    $.fn.sparkline = function (uservalues, options) {
        options = $.extend({
            type : 'line',
            lineColor : '#00f',
            fillColor : '#cdf',
            defaultPixelsPerValue : 3,
            width : 'auto',
            height : 'auto',
            composite : false
        }, options ? options : {});

        return this
                .each(function () {
                    var render = function () {
                        var values = (uservalues === 'html' || uservalues === undefined) ? $(
                                this).text().split(',')
                                : uservalues;

                        var width = options.width === 'auto' ? values.length * options.defaultPixelsPerValue : options.width;
                        if (options.height === 'auto') {
                            if (!options.composite || !this.vcanvas) {
                                // must be a better way to get the line height
                                var tmp = document.createElement('span');
                                tmp.innerHTML = 'a';
                                $(this).html(tmp);
                                height = $(tmp).innerHeight();
                                $(tmp).remove();
                            }
                        } else {
                            height = options.height;
                        }

                        $.fn.sparkline[options.type].call(this, values,
                                options, width, height);
                    };
                    // jQuery 1.3.0 completely changed the meaning of :hidden
                    // :-/
                    if (($(this).html() && $(this).is(':hidden')) || ($.fn.jquery < "1.3.0" && $(this).parents().is(
                                    ':hidden'))) {
                        pending.push([ this, render ]);
                    } else {
                        render.call(this);
                    }
                });
    };

    $.sparkline_display_visible = function () {
        for (var i = pending.length - 1; i >= 0; i--) {
            var el = pending[i][0];
            if ($(el).is(':visible') && !$(el).parents().is(':hidden')) {
                pending[i][1].call(el);
                pending.splice(i, 1);
            }
        }
    };

    $.fn.sparkline.line = function (values, options, width, height) {
        options = $.extend({
            spotColor : '#f80',
            spotRadius : 1.5,
            minSpotColor : '#f80',
            maxSpotColor : '#f80',
            lineWidth : 1,
            normalRangeMin : undefined,
            normalRangeMax : undefined,
            normalRangeColor : '#ccc',
            chartRangeMin : undefined,
            chartRangeMax : undefined
        }, options ? options : {});
        var i;
        var xvalues = [], yvalues = [], yminmax = [];
        for (i = 0; i < values.length; i++) {
            var v = values[i];
            var isstr = typeof (values[i]) === 'string';
            var isarray = typeof (values[i]) === 'object' && values[i] instanceof Array;
            var sp = isstr && values[i].split(':');
            if (isstr && sp.length === 2) { // x:y
                xvalues.push(Number(sp[0]));
                yvalues.push(Number(sp[1]));
                yminmax.push(Number(sp[1]));
            } else if (isarray) {
                xvalues.push(values[i][0]);
                yvalues.push(values[i][1]);
                yminmax.push(values[i][1]);
            } else {
                xvalues.push(i);
                if (values[i] === null || values[i] === 'null') {
                    yvalues.push(null);
                } else {
                    yvalues.push(Number(values[i]));
                    yminmax.push(Number(values[i]));
                }
            }
        }
        if (options.xvalues) {
            xvalues = options.xvalues;
        }

        var maxy = Math.max.apply(Math, yminmax);
        var maxyval = maxy;
        var miny = Math.min.apply(Math, yminmax);
        var minyval = miny;

        var maxx = Math.max.apply(Math, xvalues);
        var maxxval = maxx;
        var minx = Math.min.apply(Math, xvalues);
        var minxval = minx;

        if (options.normalRangeMin !== undefined) {
            if (options.normalRangeMin < miny) {
                miny = options.normalRangeMin;
            }
            if (options.normalRangeMax > maxy) {
                maxy = options.normalRangeMax;
            }
        }
        if (options.chartRangeMin !== undefined && options.chartRangeMin < miny) {
            miny = options.chartRangeMin;
        }
        if (options.chartRangeMax !== undefined && options.chartRangeMax > maxy) {
            maxy = options.chartRangeMax;
        }
        var rangex = maxx - minx === 0 ? 1 : maxx - minx;
        var rangey = maxy - miny === 0 ? 1 : maxy - miny;
        var vl = yvalues.length - 1;

        if (vl < 1) {
            this.innerHTML = '';
            return;
        }

        var target = $(this).simpledraw(width, height, options.composite);
        if (target) {
            var canvas_width = target.pixel_width;
            var canvas_height = target.pixel_height;
            var canvas_top = 0;
            var canvas_left = 0;

            if (options.spotRadius && (canvas_width < (options.spotRadius * 4) || canvas_height < (options.spotRadius * 4))) {
                options.spotRadius = 0;
            }
            if (options.spotRadius) {
                // adjust the canvas size as required so that spots will fit
                if (options.minSpotColor || (options.spotColor && yvalues[vl] === miny)) {
                    canvas_height -= Math.ceil(options.spotRadius);
                }
                if (options.maxSpotColor || (options.spotColor && yvalues[vl] === maxy)) {
                    canvas_height -= Math.ceil(options.spotRadius);
                    canvas_top += Math.ceil(options.spotRadius);
                }
                if (options.minSpotColor || options.maxSpotColor && (yvalues[0] === miny || yvalues[0] === maxy)) {
                    canvas_left += Math.ceil(options.spotRadius);
                    canvas_width -= Math.ceil(options.spotRadius);
                }
                if (options.spotColor || (options.minSpotColor || options.maxSpotColor && (yvalues[vl] === miny || yvalues[vl] === maxy))) {
                    canvas_width -= Math.ceil(options.spotRadius);
                }
            }

            canvas_height--;
            if (options.normalRangeMin !== undefined) {
                var ytop = canvas_top + Math
                                .round(canvas_height - (canvas_height * ((options.normalRangeMax - miny) / rangey)));
                height = Math
                        .round((canvas_height * (options.normalRangeMax - options.normalRangeMin)) / rangey);
                target.drawRect(canvas_left, ytop, canvas_width, height,
                        undefined, options.normalRangeColor);
            }

            var path = [];
            var paths = [ path ];
            for (i = 0; i < yvalues.length; i++) {
                x = xvalues[i];
                y = yvalues[i];
                if (y === null) {
                    if (i) {
                        if (yvalues[i - 1] !== null) {
                            path = [];
                            paths.push(path);
                        }
                    }
                } else {
                    if (!path.length) {
                        // previous value was null
                        path.push([
                                canvas_left + Math.round((x - minx) * (canvas_width / rangex)),
                                canvas_top + canvas_height
                            ]);
                    }
                    path.push([
                        canvas_left + Math.round((x - minx) * (canvas_width / rangex)),
                        canvas_top  + Math.round(canvas_height - (canvas_height * ((y - miny) / rangey)))
                    ]);
                }
            }
            for (i = 0; i < paths.length; i++) {
                path = paths[i];
                if (!path.length) {
                    continue; // last value was null
                }
                if (options.fillColor) {
                    path.push([ path[path.length - 1][0],
                            canvas_top + canvas_height - 1 ]);
                    target.drawShape(path, undefined, options.fillColor);
                    path.pop();
                }
                // if there's only a single point in this path, then we want to
                // display it as a vertical line
                // which means we keep path[0] as is
                if (path.length > 2) {
                    // else we want the first value
                    path[0] = [ path[0][0], path[1][1] ];
                }
                target.drawShape(path, options.lineColor, undefined,
                        options.lineWidth);
            }
            if (options.spotRadius && options.spotColor) {
                target
                        .drawCircle(
                                canvas_left + canvas_width,
                                canvas_top + Math.round(canvas_height - (canvas_height * ((yvalues[vl] - miny) / rangey))),
                                options.spotRadius, undefined,
                                options.spotColor);
            }
            if (maxy !== minyval) {
                if (options.spotRadius && options.minSpotColor) {
                    x = xvalues[yvalues.indexOf(minyval)];
                    target.drawCircle(
                                    canvas_left + Math.round((x - minx) * (canvas_width / rangex)),
                                    canvas_top + Math.round(canvas_height - (canvas_height * ((minyval - miny) / rangey))),
                                    options.spotRadius, undefined,
                                    options.minSpotColor);
                }
                if (options.spotRadius && options.maxSpotColor) {
                    x = xvalues[yvalues.indexOf(maxyval)];
                    target
                            .drawCircle(
                                    canvas_left + Math.round((x - minx) * (canvas_width / rangex)),
                                    canvas_top + Math.round(canvas_height - (canvas_height * ((maxyval - miny) / rangey))),
                                    options.spotRadius, undefined,
                                    options.maxSpotColor);
                }
            }
        } else {
            // Remove the tag contents if sparklines aren't supported
            this.innerHTML = '';
        }
    };

    $.fn.sparkline.bar = function (values, options, width, height) {
        options = $.extend({
            type : 'bar',
            barColor : '#00f',
            negBarColor : '#f44',
            zeroColor : undefined,
            zeroAxis : undefined,
            barWidth : 4,
            barSpacing : 1,
            chartRangeMax : undefined,
            chartRangeMin : undefined,
            colorMap : {}
        }, options ? options : {});

        width = (values.length * options.barWidth) + ((values.length - 1) * options.barSpacing);
        var num_values = [];
        for (var i = 0; i < values.length; i++) {
            if (values[i] === 'null' || values[i] === null) {
                values[i] = null;
            } else {
                values[i] = Number(values[i]);
                num_values.push(Number(values[i]));
            }
        }
        var max = Math.max.apply(Math, num_values);
        var min = Math.min.apply(Math, num_values);
        if (options.chartRangeMin !== undefined && options.chartRangeMin < min) {
            min = options.chartRangeMin;
        }
        if (options.chartRangeMax !== undefined && options.chartRangeMax > max) {
            max = options.chartRangeMax;
        }
        if (options.zeroAxis === undefined) {
            options.zeroAxis = min < 0;
        }
        var range = max - min === 0 ? 1 : max - min;

        var target = $(this).simpledraw(width, height);
        if (target) {
            var canvas_width = target.pixel_width;
            var canvas_height = target.pixel_height;
            var yzero = min < 0 && options.zeroAxis ? canvas_height - Math.round(canvas_height * (Math.abs(min) / range)) - 1
                    : canvas_height - 1;

            for (i = 0; i < values.length; i++) {
                var x = i * (options.barWidth + options.barSpacing);
                var val = values[i];
                if (val === null) {
                    continue;
                }
                var color = (val < 0) ? options.negBarColor : options.barColor;
                if (options.zeroAxis && min < 0) {
                    height = Math.round(canvas_height * ((Math.abs(val) / range))) + 1;
                    y = (val < 0) ? yzero : yzero - height;
                } else {
                    height = Math.round(canvas_height * ((val - min) / range)) + 1;
                    y = canvas_height - height;
                }
                if (val === 0 && options.zeroColor !== undefined) {
                    color = options.zeroColor;
                }
                if (options.colorMap[val]) {
                    color = options.colorMap[val];
                }
                target.drawRect(x, y, options.barWidth - 1, height - 1, color,
                        color);
            }
        } else {
            // Remove the tag contents if sparklines aren't supported
            this.innerHTML = '';
        }
    };

    $.fn.sparkline.tristate = function (values, options, width, height) {
        values = $.map(values, Number);
        options = $.extend({
            barWidth : 4,
            barSpacing : 1,
            posBarColor : '#6f6',
            negBarColor : '#f44',
            zeroBarColor : '#999',
            colorMap : {}
        }, options);

        width = (values.length * options.barWidth) + ((values.length - 1) * options.barSpacing);

        var target = $(this).simpledraw(width, height);
        if (target) {
            var canvas_width = target.pixel_width;
            var canvas_height = target.pixel_height;
            var half_height = Math.round(canvas_height / 2);

            for (var i = 0; i < values.length; i++) {
                var x = i * (options.barWidth + options.barSpacing);
                if (values[i] < 0) {
                    y = half_height;
                    height = half_height - 1;
                    color = options.negBarColor;
                } else if (values[i] > 0) {
                    y = 0;
                    height = half_height - 1;
                    color = options.posBarColor;
                } else {
                    y = half_height - 1;
                    height = 2;
                    color = options.zeroBarColor;
                }
                if (options.colorMap[values[i]]) {
                    color = options.colorMap[values[i]];
                }
                target.drawRect(x, y, options.barWidth - 1, height - 1, color,
                        color);
            }
        } else {
            // Remove the tag contents if sparklines aren't supported
            this.innerHTML = '';
        }
    };

    $.fn.sparkline.discrete = function (values, options, width, height) {
        values = $.map(values, Number);
        options = $.extend({
            lineHeight : 'auto',
            thresholdColor : undefined,
            thresholdValue : 0,
            chartRangeMax : undefined,
            chartRangeMin : undefined
        }, options);

        width = options.width === 'auto' ? values.length * 2 : width;
        var interval = Math.floor(width / values.length);

        var target = $(this).simpledraw(width, height);
        if (target) {
            var canvas_width = target.pixel_width;
            var canvas_height = target.pixel_height;
            var line_height = options.lineHeight === 'auto' ? Math
                    .round(canvas_height * 0.3) : options.lineHeight;
            var pheight = canvas_height - line_height;
            var min = Math.min.apply(Math, values);
            var max = Math.max.apply(Math, values);
            if (options.chartRangeMin !== undefined && options.chartRangeMin < min) {
                min = options.chartRangeMin;
            }
            if (options.chartRangeMax !== undefined && options.chartRangeMax > max) {
                max = options.chartRangeMax;
            }
            var range = max - min;

            for (var i = 0; i < values.length; i++) {
                var val = values[i];
                var x = (i * interval);
                var ytop = Math
                        .round(pheight - pheight * ((val - min) / range));
                target
                        .drawLine(
                                x,
                                ytop,
                                x,
                                ytop + line_height,
                                (options.thresholdColor && val < options.thresholdValue) ? options.thresholdColor
                                        : options.lineColor);
            }
        } else {
            // Remove the tag contents if sparklines aren't supported
            this.innerHTML = '';
        }

    };

    $.fn.sparkline.bullet = function (values, options, width, height) {
        values = $.map(values, Number);
        // target, performance, range1, range2, range3
        options = $.extend({
            targetColor : 'red',
            targetWidth : 3, // width of the target bar in pixels
            performanceColor : 'blue',
            rangeColors : [ '#D3DAFE', '#A8B6FF', '#7F94FF' ],
            base : undefined
        // set this to a number to change the base start number
        }, options);

        width = options.width === 'auto' ? '4.0em' : width;

        var target = $(this).simpledraw(width, height);
        if (target && values.length > 1) {
            var canvas_width = target.pixel_width - Math.ceil(options.targetWidth / 2);
            var canvas_height = target.pixel_height;

            var min = Math.min.apply(Math, values);
            var max = Math.max.apply(Math, values);
            if (options.base === undefined) {
                min = min < 0 ? min : 0;
            } else {
                min = options.base;
            }
            var range = max - min;

            // draw range values
            for (i = 2; i < values.length; i++) {
                var rangeval = parseInt(values[i], 10);
                var rangewidth = Math.round(canvas_width * ((rangeval - min) / range));
                target.drawRect(0, 0, rangewidth - 1, canvas_height - 1,
                        options.rangeColors[i - 2], options.rangeColors[i - 2]);
            }

            // draw the performance bar
            var perfval = parseInt(values[1], 10);
            var perfwidth = Math
                    .round(canvas_width * ((perfval - min) / range));
            target.drawRect(0, Math.round(canvas_height * 0.3), perfwidth - 1,
                    Math.round(canvas_height * 0.4) - 1,
                    options.performanceColor, options.performanceColor);

            // draw the target linej
            var targetval = parseInt(values[0], 10);
            var x = Math.round(canvas_width * ((targetval - min) / range) - (options.targetWidth / 2));
            var targettop = Math.round(canvas_height * 0.10);
            var targetheight = canvas_height - (targettop * 2);
            target.drawRect(x, targettop, options.targetWidth - 1,
                    targetheight - 1, options.targetColor, options.targetColor);
        } else {
            // Remove the tag contents if sparklines aren't supported
            this.innerHTML = '';
        }
    };

    $.fn.sparkline.pie = function (values, options, width, height) {
        values = $.map(values, Number);
        options = $.extend({
            sliceColors : [ '#f00', '#0f0', '#00f' ]
        }, options);

        width = options.width === 'auto' ? height : width;

        var target = $(this).simpledraw(width, height);
        if (target && values.length > 1) {
            var canvas_width = target.pixel_width;
            var canvas_height = target.pixel_height;

            var radius = Math.floor(Math.min(canvas_width, canvas_height) / 2);
            var total = 0;
            for (var i = 0; i < values.length; i++) {
                total += values[i];
            }
            var next = 0;
            if (options.offset) {
                next += (2 * Math.PI) * (options.offset / 360);
            }
            var circle = 2 * Math.PI;
            for (i = 0; i < values.length; i++) {
                var start = next;
                var end = next;
                if (total > 0) { // avoid divide by zero
                    end = next + (circle * (values[i] / total));
                }
                target.drawPieSlice(radius, radius, radius, start, end,
                        undefined, options.sliceColors[i % options.sliceColors.length]);
                next = end;
            }
        }
    };

    function quartile(values, q) {
        if (q === 2) {
            var vl2 = Math.floor(values.length / 2);
            return values.length % 2 ? values[vl2]
                    : (values[vl2] + values[vl2 + 1]) / 2;
        } else {
            var vl4 = Math.floor(values.length / 4);
            return values.length % 2 ? (values[vl4 * q] + values[vl4 * q + 1]) / 2
                    : values[vl4 * q];
        }
    }


    $.fn.sparkline.box = function (values, options, width, height) {
        values = $.map(values, Number);
        options = $.extend({
            raw : false,
            boxLineColor : 'black',
            boxFillColor : '#cdf',
            whiskerColor : 'black',
            outlierLineColor : '#333',
            outlierFillColor : 'white',
            medianColor : 'red',
            showOutliers : true,
            outlierIQR : 1.5,
            spotRadius : 1.5,
            target : undefined,
            targetColor : '#4a2',
            chartRangeMax : undefined,
            chartRangeMin : undefined
        }, options);

        var lwhisker;
        var rwhisker;
        var loutlier;
        var routlier;

        width = options.width === 'auto' ? '4.0em' : width;

        minvalue = options.chartRangeMin === undefined ? Math.min.apply(Math,
                values) : options.chartRangeMin;
        maxvalue = options.chartRangeMax === undefined ? Math.max.apply(Math,
                values) : options.chartRangeMax;
        var target = $(this).simpledraw(width, height);
        if (target && values.length > 1) {
            var canvas_width = target.pixel_width;
            var canvas_height = target.pixel_height;
            if (options.raw) {

                if (options.showOutliers && values.length > 5) {
                    loutlier = values[0];
                    lwhisker = values[1];
                    q1 = values[2];
                    q2 = values[3];
                    q3 = values[4];
                    rwhisker = values[5];
                    routlier = values[6];
                } else {
                    lwhisker = values[0];
                    q1 = values[1];
                    q2 = values[2];
                    q3 = values[3];
                    rwhisker = values[4];
                }
            } else {
                values.sort(function (a, b) {
                    return a - b;
                });
                q1 = quartile(values, 1);
                q2 = quartile(values, 2);
                q3 = quartile(values, 3);
                var iqr = q3 - q1;
                if (options.showOutliers) {
                    lwhisker = undefined;
                    rwhisker = undefined;
                    for (var i = 0; i < values.length; i++) {
                        if (lwhisker === undefined && values[i] > q1 - (iqr * options.outlierIQR)) {
                            lwhisker = values[i];
                        }
                        if (values[i] < q3 + (iqr * options.outlierIQR)) {
                            rwhisker = values[i];
                        }
                    }
                    loutlier = values[0];
                    routlier = values[values.length - 1];
                } else {
                    lwhisker = values[0];
                    rwhisker = values[values.length - 1];
                }
            }

            var unitsize = canvas_width / (maxvalue - minvalue + 1);
            var canvas_left = 0;
            if (options.showOutliers) {
                canvas_left = Math.ceil(options.spotRadius);
                canvas_width -= 2 * Math.ceil(options.spotRadius);
                unitsize = canvas_width / (maxvalue - minvalue + 1);
                if (loutlier < lwhisker) {
                    target.drawCircle((loutlier - minvalue) * unitsize + canvas_left, canvas_height / 2,
                            options.spotRadius, options.outlierLineColor,
                            options.outlierFillColor);
                }
                if (routlier > rwhisker) {
                    target.drawCircle((routlier - minvalue) * unitsize + canvas_left, canvas_height / 2,
                            options.spotRadius, options.outlierLineColor,
                            options.outlierFillColor);
                }
            }

            // box
            target.drawRect(Math
                    .round((q1 - minvalue) * unitsize + canvas_left), Math
                    .round(canvas_height * 0.1), Math.round((q3 - q1) * unitsize), Math.round(canvas_height * 0.8),
                    options.boxLineColor, options.boxFillColor);
            // left whisker
            target.drawLine(Math.round((lwhisker - minvalue) * unitsize + canvas_left), Math.round(canvas_height / 2), Math
                    .round((q1 - minvalue) * unitsize + canvas_left), Math
                    .round(canvas_height / 2), options.lineColor);
            target.drawLine(Math.round((lwhisker - minvalue) * unitsize + canvas_left), Math.round(canvas_height / 4), Math
                    .round((lwhisker - minvalue) * unitsize + canvas_left),
                    Math.round(canvas_height - canvas_height / 4),
                    options.whiskerColor);
            // right whisker
            target.drawLine(Math.round((rwhisker - minvalue) * unitsize + canvas_left), Math.round(canvas_height / 2), Math
                    .round((q3 - minvalue) * unitsize + canvas_left), Math
                    .round(canvas_height / 2), options.lineColor);
            target.drawLine(Math.round((rwhisker - minvalue) * unitsize + canvas_left), Math.round(canvas_height / 4), Math
                    .round((rwhisker - minvalue) * unitsize + canvas_left),
                    Math.round(canvas_height - canvas_height / 4),
                    options.whiskerColor);
            // median line
            target.drawLine(Math
                    .round((q2 - minvalue) * unitsize + canvas_left), Math
                    .round(canvas_height * 0.1), Math.round((q2 - minvalue) * unitsize + canvas_left), Math.round(canvas_height * 0.9),
                    options.medianColor);
            if (options.target) {
                var size = Math.ceil(options.spotRadius);
                target.drawLine(Math.round((options.target - minvalue) * unitsize + canvas_left), Math
                        .round((canvas_height / 2) - size), Math
                        .round((options.target - minvalue) * unitsize + canvas_left), Math.round((canvas_height / 2) + size), options.targetColor);
                target.drawLine(Math.round((options.target - minvalue) * unitsize + canvas_left - size), Math
                        .round(canvas_height / 2), Math
                        .round((options.target - minvalue) * unitsize + canvas_left + size), Math
                        .round(canvas_height / 2), options.targetColor);
            }
        } else {
            // Remove the tag contents if sparklines aren't supported
            this.innerHTML = '';
        }
    };

    // IE doesn't provide an indexOf method for arrays :-(
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (entry) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === entry) {
                    return i;
                }
            }
            return -1;
        };
    }

    // Setup a very simple "virtual canvas" to make drawing the few shapes we
    // need easier
    // This is accessible as $(foo).simpledraw()

    if ($.browser.msie && !document.namespaces.v) {
        document.namespaces.add('v', 'urn:schemas-microsoft-com:vml',
                '#default#VML');
    }

    if ($.browser.hasCanvas === undefined) {
        var t = document.createElement('canvas');
        $.browser.hasCanvas = t.getContext !== undefined;
    }

    var Vcanvas_base = function (width, height, target) {
    };

    Vcanvas_base.prototype = {
        init : function (width, height, target) {
            this.width = width;
            this.height = height;
            this.target = target;
            if (target[0]) {
                target = target[0];
            }
            target.vcanvas = this;
        },

        drawShape : function (path, lineColor, fillColor, lineWidth) {
            alert('drawShape not implemented');
        },

        drawLine : function (x1, y1, x2, y2, lineColor, lineWidth) {
            return this.drawShape([ [ x1, y1 ], [ x2, y2 ] ], lineColor,
                    lineWidth);
        },

        drawCircle : function (x, y, radius, lineColor, fillColor) {
            alert('drawCircle not implemented');
        },

        drawPieSlice : function (x, y, radius, startAngle, endAngle, lineColor,
                fillColor) {
            alert('drawPieSlice not implemented');
        },

        drawRect : function (x, y, width, height, lineColor, fillColor) {
            alert('drawRect not implemented');
        },

        getElement : function () {
            return this.canvas;
        },
        // fixing jslint compaint about '_'
        p_insert : function (el, target) {
            $(target).html(el);
        }
    };

    var Vcanvas_canvas = function (width, height, target) {
        return this.init(width, height, target);
    };

    Vcanvas_canvas.prototype = $.extend(new Vcanvas_base(), {
        p_super : Vcanvas_base.prototype,

        init : function (width, height, target) {
            this.p_super.init(width, height, target);
            this.canvas = document.createElement('canvas');
            if (target[0]) {
                target = target[0];
            }
            target.vcanvas = this;
            $(this.canvas).css({
                display : 'inline-block',
                width : width,
                height : height,
                verticalAlign : 'top'
            });
            this.p_insert(this.canvas, target);
            this.pixel_height = $(this.canvas).height();
            this.pixel_width = $(this.canvas).width();
            this.canvas.width = this.pixel_width;
            this.canvas.height = this.pixel_height;
            $(this.canvas).css({
                width : this.pixel_width,
                height : this.pixel_height
            });
        },

        p_getContext : function (lineColor, fillColor, lineWidth) {
            var context = this.canvas.getContext('2d');
            if (lineColor !== undefined) {
                context.strokeStyle = lineColor;
            }
            context.lineWidth = lineWidth === undefined ? 1 : lineWidth;
            if (fillColor !== undefined) {
                context.fillStyle = fillColor;
            }
            return context;
        },

        drawShape : function (path, lineColor, fillColor, lineWidth) {
            var context = this.p_getContext(lineColor, fillColor, lineWidth);
            context.beginPath();
            context.moveTo(path[0][0] + 0.5, path[0][1] + 0.5);
            for (var i = 1; i < path.length; i++) {
                context.lineTo(path[i][0] + 0.5, path[i][1] + 0.5); // the 0.5
                                                                    // offset
                                                                    // gives us
                                                                    // crisp
                                                                    // pixel-width
                                                                    // lines
            }
            if (lineColor !== undefined) {
                context.stroke();
            }
            if (fillColor !== undefined) {
                context.fill();
            }
        },

        drawCircle : function (x, y, radius, lineColor, fillColor) {
            var context = this.p_getContext(lineColor, fillColor);
            context.beginPath();
            context.arc(x, y, radius, 0, 2 * Math.PI, false);
            if (lineColor !== undefined) {
                context.stroke();
            }
            if (fillColor !== undefined) {
                context.fill();
            }
        },

        drawPieSlice : function (x, y, radius, startAngle, endAngle, lineColor,
                fillColor) {
            var context = this.p_getContext(lineColor, fillColor);
            context.beginPath();
            context.moveTo(x, y);
            context.arc(x, y, radius, startAngle, endAngle, false);
            context.lineTo(x, y);
            context.closePath();
            if (lineColor !== undefined) {
                context.stroke();
            }
            if (fillColor) {
                context.fill();
            }
        },

        drawRect : function (x, y, width, height, lineColor, fillColor) {
            return this.drawShape([ [ x, y ], [ x + width, y ],
                    [ x + width, y + height ], [ x, y + height ], [ x, y ] ],
                    lineColor, fillColor);
        }

    });

    var Vcanvas_vml = function (width, height, target) {
        return this.init(width, height, target);
    };

    Vcanvas_vml.prototype = $.extend(new Vcanvas_base(), {
        p_super : Vcanvas_base.prototype,

        init : function (width, height, target) {
            this.p_super.init(width, height, target);
            if (target[0]) {
                target = target[0];
            }
            target.vcanvas = this;
            this.canvas = document.createElement('span');
            $(this.canvas).css({
                display : 'inline-block',
                position : 'relative',
                overflow : 'hidden',
                width : width,
                height : height,
                margin : '0px',
                padding : '0px',
                verticalAlign : 'top'
            });
            this.p_insert(this.canvas, target);
            this.pixel_height = $(this.canvas).height();
            this.pixel_width = $(this.canvas).width();
            this.canvas.width = this.pixel_width;
            this.canvas.height = this.pixel_height;

            var groupel = '<v:group coordorigin="0 0" coordsize="' +
                this.pixel_width + ' ' + this.pixel_height + '"' +
                ' style="position:absolute;top:0;left:0;width:' +
                this.pixel_width + 'px;height=' + this.pixel_height +
                'px;"></v:group>';
            this.canvas.insertAdjacentHTML('beforeEnd', groupel);
            this.group = $(this.canvas).children()[0];
        },

        drawShape : function (path, lineColor, fillColor, lineWidth) {
            var vpath = [];
            for (var i = 0; i < path.length; i++) {
                vpath[i] = '' + (path[i][0]) + ',' + (path[i][1]);
            }
            var initial = vpath.splice(0, 1);
            lineWidth = lineWidth === undefined ? 1 : lineWidth;
            var stroke = lineColor === undefined ? ' stroked="false" '
                    : ' strokeWeight="' + lineWidth + '" strokeColor="' + lineColor + '" ';
            var fill = fillColor === undefined ? ' filled="false"'
                    : ' fillColor="' + fillColor + '" filled="true" ';
            var closed = vpath[0] === vpath[vpath.length - 1] ? 'x ' : '';
            var vel = '<v:shape coordorigin="0 0" coordsize="' +
                    this.pixel_width + ' ' + this.pixel_height + '" ' +
                    stroke + fill +
                    ' style="position:absolute;left:0px;top:0px;height:' +
                    this.pixel_height + 'px;width:' + this.pixel_width +
                    'px;padding:0px;margin:0px;" ' + ' path="m ' + initial +
                    ' l ' + vpath.join(', ') + ' ' + closed + 'e">' +
                    ' </v:shape>';
            this.group.insertAdjacentHTML('beforeEnd', vel);
        },

        drawCircle : function (x, y, radius, lineColor, fillColor) {
            x -= radius + 1;
            y -= radius + 1;
            var stroke = lineColor === undefined ? ' stroked="false" '
                    : ' strokeWeight="1" strokeColor="' + lineColor + '" ';
            var fill = fillColor === undefined ? ' filled="false"'
                    : ' fillColor="' + fillColor + '" filled="true" ';
            var vel = '<v:oval ' + stroke + fill +
                    ' style="position:absolute;top:' + y + 'px; left:' + x +
                    'px; width:' + (radius * 2) + 'px; height:' +
                    (radius * 2) + 'px"></v:oval>';
            this.group.insertAdjacentHTML('beforeEnd', vel);

        },

        drawPieSlice : function (x, y, radius, startAngle, endAngle, lineColor,
                fillColor) {
            if (startAngle === endAngle) {
                return; // VML seems to have problem when start angle equals end
                        // angle.
            }
            if ((endAngle - startAngle) === (2 * Math.PI)) {
                startAngle = 0.0; // VML seems to have a problem when drawing
                                    // a full circle that doesn't start 0
                endAngle = (2 * Math.PI);
            }

            var startx = x + Math.round(Math.cos(startAngle) * radius);
            var starty = y + Math.round(Math.sin(startAngle) * radius);
            var endx = x + Math.round(Math.cos(endAngle) * radius);
            var endy = y + Math.round(Math.sin(endAngle) * radius);

            var vpath = [ x - radius, y - radius, x + radius, y + radius,
                    startx, starty, endx, endy ];
            var stroke = lineColor === undefined ? ' stroked="false" '
                    : ' strokeWeight="1" strokeColor="' + lineColor + '" ';
            var fill = fillColor === undefined ? ' filled="false"'
                    : ' fillColor="' + fillColor + '" filled="true" ';
            var vel = '<v:shape coordorigin="0 0" coordsize="' +
                    this.pixel_width + ' ' + this.pixel_height + '" ' +
                    stroke + fill +
                    ' style="position:absolute;left:0px;top:0px;height:' +
                    this.pixel_height + 'px;width:' + this.pixel_width +
                    'px;padding:0px;margin:0px;" ' + ' path="m ' + x + ',' +
                    y + ' wa ' + vpath.join(', ') + ' x e">' + ' </v:shape>';
            this.group.insertAdjacentHTML('beforeEnd', vel);
        },

        drawRect : function (x, y, width, height, lineColor, fillColor) {
            return this.drawShape([ [ x, y ], [ x, y + height ],
                    [ x + width, y + height ], [ x + width, y ], [ x, y ] ],
                    lineColor, fillColor);
        }
    });

}(jQuery));
/*
    http://www.JSON.org/json2.js
    2009-08-17

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html

    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (!this.JSON) {
    this.JSON = {};
}

(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                   this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
/*jslint regexp: false */
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                /*jslint evil: true */
                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());
/**
 * @name t11e
 * @namespace
 */

(function () {
    var is_undefined = function (arg) {
        return 'undefined' === typeof arg;
    };
    var declare = function (symbol, object) {
        var parts = symbol.split('.');
        var scope = window;
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (is_undefined(scope[part])) {
                if (i !== parts.length - 1) {
                    scope[part] = {};
                } else {
                    scope[part] = object;
                }
            }
            scope = scope[part];
        }
    };
    declare('t11e.util', {});
    t11e.util.declare = declare;
    t11e.util.is_undefined = is_undefined;
}());

t11e.util.define_namespace = function (namespace) {
    t11e.util.declare(namespace, {});
};
t11e.util.define_namespace('t11e.internals');

/**
 * @name t11e.internals
 * @namespace
 */

/**
 * Internal logger function that can dispatch to window.console.log,
 * window.console.warn and window.console.error. Has special logic
 * to deal with IE8 and gracefully handles the case that window.console
 * doesn't exist.
 */
t11e.internals.log = function (type, params) {
    if (t11e.util.is_defined(window.console)) {
        var logger = window.console[type];
        if (t11e.util.is_defined(logger)) {
            if (t11e.util.is_defined(logger.apply)) {
                logger.apply(window.console, params);
            } else {
                // IE8 implements console.log differently.
                params = Array.prototype.slice.call(params, 0);
                logger(params.join(" "));
            }
        }
    }
};

/**
 * @name t11e.internals.get_keys
 * @function
 * @param map
 * @returns Array
 */
t11e.internals.get_keys = function (map) {
    var keys = [];
    var empty = {};
    for (var key in map) {
        var value = map[key];
        if (t11e.util.is_defined(value) && value !== empty[key]) {
            keys.push(key);
        }
    }
    return keys;
};

/**
 * @name t11e.internals.contains_value
 * @function
 * @param array
 * @param value
 * @return boolean
 */
t11e.internals.contains_value = function (array, value) {
    var result = false;
    var test;
    for (var i = 0; i < array.length && !result; i++) {
        test = array[i];
        if (value === test) {
            result = true;
        }
    }
    return result;
};

/**
 * @name t11e.internals.remove_value
 * @function
 * @param array
 * @param value
 * @return array
 */
t11e.internals.remove_value = function (array, value) {
    var result = [];
    for (var i = 0; i < array.length; i++) {
        if (array[i] !== value) {
            result.push(array[i]);
        }
    }
    return result;
};

/**
 * @name t11e.internals.intersect
 * @function
 * @param array1
 * @param array2
 */
t11e.internals.intersect = function (array1, array2) {
    var result = [];
    var value;
    var contains_value = t11e.internals.contains_value;
    for (var i = 0; i < array1.length; i++) {
        value = array1[i];
        if (contains_value(array2, value)) {
            result.push(value);
        }
    }
    return result;
};

/**
 * @name t11e.internals.update_map
 * @function
 * @param target
 * @param source
 * @return target
 */
t11e.internals.update_map = function (target, source) {
    var keys = t11e.internals.get_keys(source);
    var key;
    for (var i = 0; i < keys.length; i++) {
        key = keys[i];
        target[key] = source[key];
    }
    return target;
};

/**
 * @name t11e.internals.remove_from_map
 * @function
 * @param target
 * @param keys
 */
t11e.internals.remove_from_map = function (target, keys) {
    var key;
    for (var i = 0; i < keys.length; i++) {
        key = keys[i];
        delete target[key];
    }
    return target;
};

/**
 * @name t11e.internals.is_empty
 * @function
 * @param map
 * @return boolean
 */
t11e.internals.is_empty = function (map) {
    return t11e.internals.get_keys(map).length === 0;
};

if (false) {
    t11e.internals.prototype.Eclipse__Outline__Hack = undefined;
}
t11e.util.define_namespace('t11e.event');
/**
 * @name t11e.event
 * @namespace
 *
 * Module that provides generic publisher/subscriber functionality and is
 * used as a mechanism to hook up all the various components in a framework
 * independent fashion.
 */
(function () {
    /** @private */
    var empty = {};
    /** @private */
    var topics = {};

    /**
     * Subscribe to a topic.
     *
     * Any given handler can be subscribed just once, subsequent calls
     * will be ignored.
     *
     * <pre class="brush: js">
     *     t11e.event.subscribe('perform_search', callback);
     * </pre>
     * @param topic
     *   The topic name.
     * @param handler
     *   Function which recieves events posted to the topic.
     */
    t11e.event.subscribe = function (topic, handler) {
        var handlers = topics[topic];
        if (t11e.util.is_undefined(handlers) || handlers === empty[topic]) {
            handlers = [];
            topics[topic] = handlers;
        }
        var found = false;
        for (var i = 0; i < handlers.length; i++) {
            if (handlers[i] === handler) {
                found = true;
                break;
            }
        }
        if (!found) {
            handlers.push(handler);
        }
    };

    /**
    * Unsubscribe from a topic.
    *
    * If the handler isn't currently subscribed then this method does
    * nothing.
    *
    * @param topic
    *   The topic name.
    * @param handler
    *   Function which recieves events posted to the topic.
    */
    t11e.event.unsubscribe = function (topic, handler) {
        var handlers = topics[topic];
        if (t11e.util.is_defined(handlers) && handlers !== empty[topic]) {
            var new_handlers = [];
            var new_len = 0;
            for (var i = 0; i < handlers.length; i++) {
                var old_handler = handlers[i];
                if (old_handler !== handler) {
                    new_handlers.push(old_handler);
                    new_len++;
                }
            }
            if (new_len > 0) {
                topics[topic] = new_handlers;
            } else {
                delete topics[topic];
            }
        }
    };

    /**
    * Send an event to listeners on a topic.
    *
    * Takes two mandatory arguments, anything else is passed through
    * as arguments to the handler.
    *
    * Calling <code>trigger('example', 1, 2, 3)</code> will
    * cause the handler to be called with the arguments
    * <code>1, 2, 3</code>.
    *
    * @param topic
    *   The topic on which to send the event.
    */
    t11e.event.trigger = function (topic) {
        if (t11e.event.debug) {
            t11e.util.log('--- BEGIN EVENT ---', topic);
        }
        var params = Array.prototype.slice.call(arguments, 1);
        var handlers = topics[topic];
        if (t11e.util.is_defined(handlers) && handlers !== empty[topic]) {
            for (var i = 0; i < handlers.length; i++) {
                var handler = handlers[i];
                try {
                    handler.apply(null, params);
                } catch (e) {
                    t11e.util.error('Handler on topic', topic,
                        'threw an exception', e, '\n', e.stack);
                }
            }
        }
        if (t11e.event.debug) {
            t11e.util.log('--- END EVENT   ---', topic);
        }
    };
}());

if (false) {
    t11e.event.prototype.Eclipse__Outline__Hack = undefined;
}
t11e.util.define_namespace('t11e.util');

/**
 * @name t11e.util
 * @namespace
 */

/**
 * @name t11e.util.is_defined
 * @function
 * @param {Object} arg
 */
t11e.util.is_defined = function (arg) {
    return ! t11e.util.is_undefined(arg);
};

/**
 * <p>The t11e.widget namespace encapsulates all widget implementations. The widget
 * implementations themselves are decoupled from the event handing in the {@link t11e.event}
 * module and the page controller in the {@link t11e.widget.activate_search_page} module.</p>
 *
 * <p>The current widgets are implemented using jQuery, and use the {@link t11e.widget.jquery} namespace.</p>
 *
 * @name t11e.widget
 * @namespace
 * Module that contains various Ajax based UI widgets.
 */

/**
 * <h2>Core Widget Options</h2>
 *
 * All widgets have the following options available:
 *
 * <dl>
 * <dt>name</dt>
 * <dd>Widget instances have a name, which is an identifier that is not displayed in the rendered template.</dd>
 *
 * <dt>title</dt>
 * <dd>The 'title' is used in the header of the widget template and is intended to be displayed on the page.</dd>

 * <dt>css_class</dt>
 * <dd>An option CSS class to be applied to this widget instance to facilitate custom styling. The following is
 * and example that shows where the title and css_class are placed in a standard widget template:
 *
 * <pre class="brush: html">
 * &lt;div class=&quot;t11e-widget t11e-widget-jquery-slider { css_class }
 *     t11e-widget-id-1234&quot;&gt;
 *   &lt;div class=&quot;t11e-hd t11e-widget-jquery-slider-hd&quot;&gt;{ title }
 *   &lt;div class=&quot;t11e-bd t11e-widget-jquery-slider-bd&quot;&gt;
 *       &lt;div class=&quot;amount&quot;&gt;&lt;/div&gt;
 *       &lt;div class=&quot;slider-control&quot;&gt;&lt;/div&gt;
 *   &lt;/div&gt;
 *   &lt;div class=&quot;t11e-ft t11e-widget-jquery-slider-ft&quot;&gt;&lt;/div&gt;
 * &lt;/div&gt;
 * </pre>
 * </dd>
 *
 * <dt>search_group</dt>
 * <dd>Widgets are associated with a 'search_group' and this makes it possible to have different sets of widgets on a
 *     page that are associated with different searches. Widgets use their search group when subscribing to topics, as
 *     well as when triggering events. For example, when a search widget is updated in the UI, it triggers an update_request
 *     event, passing the 'search_group' name and a callback function:
 * <pre class="code">
 *    t11e.event.trigger('update_request.' + search_group, save_to_params);
 *</pre>
 *</dd>
 *</dl>
 *
 * @name t11e.widget.jquery
 * @namespace
 * Module that contains various jQuery specific Ajax based UI widgets.
 */

/**
 * Decodes params from a query string.
 *
 * @name t11e.util.decode_params
 * @function
 * @param {Object} query_string
 * @returns {Object} parsed
 */
t11e.util.decode_params = function (query_string) {
    var parsed = {};
    var pairs = query_string.split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        var name = decodeURIComponent(pair[0]);
        if (name !== '') {
            var value = pair[1];
            value = t11e.util.is_undefined(value) ? '' : decodeURIComponent(value);
            var previous = parsed[name];
            if (t11e.util.is_undefined(previous)) {
                parsed[name] = [value];
            } else {
                previous.push(value);
            }
        }
    }
    return parsed;
};

/**
 * Encodes params from a query string.
 *
 * @name t11e.util.encode_params
 * @function
 * @param params
 * @param filter_keys
 * @returns {String} query_string
 */
t11e.util.encode_params = function (params, filter_keys) {
    var query_string = '';
    var names = t11e.internals.get_keys(params);
    if (t11e.util.is_defined(filter_keys)) {
        names = t11e.internals.intersect(names, filter_keys);
    }
    names.sort();
    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var values = params[name];
        if (!t11e.util.is_array(values)) {
            t11e.util.warn('Ignoring state entry for', name,
                'as it should be an array.', values);
        } else {
            var has_invalid_values = false;
            (function () {
                for (var j = 0; j < values.length; j++) {
                    var value = values[j];
                    if (t11e.util.is_undefined(value)) {
                        has_invalid_values = true;
                    }
                }
            }());
            if (has_invalid_values) {
                t11e.util.warn('Ignoring state entry for', name,
                    'as some values are invalid.', values);
            } else {
                (function () {
                    for (var j = 0; j < values.length; j++) {
                        var value = values[j];
                        if (query_string !== '') {
                            query_string += '&';
                        }
                        if (t11e.util.is_defined(value)) {
                            query_string += encodeURIComponent(name);
                            if ('' !== value) {
                                query_string += '=';
                                query_string += encodeURIComponent(value);
                            }
                        }
                    }
                }());
            }
        }
    }
    return query_string;
};

/**
 * Removes a parameter from the params object.
 * @name t11e.util.remove_param
 * @function
 * @param params
 * @param param
 */
t11e.util.remove_param = function (params, param) {
    if (t11e.util.is_defined(params) && t11e.util.is_defined(param)) {
        return t11e.internals.remove_from_map(params, [param]);
    }
};

/**
 * Removes a parameter with specified value from the params object.
 * @name t11e.util.remove_param_value
 * @function
 * @param params
 * @param param
 * @param value
 */
t11e.util.remove_param_value = function (params, param, value) {
    if (t11e.util.is_defined(params) && t11e.util.is_defined(param) &&
        t11e.util.is_defined(value)) {
        var values = params[param];
        params[param] = t11e.internals.remove_value(values, value);
        return params[param];
    }
};

/**
 * Utility function used to dereference a path, as in the following example
 * where <code>response_ids</code> are extracted from the search response object.
 *
 * <pre class="brush: js">
 *     var response_ids = t11e.util.deref(search, '_discovery.response.itemIds');
 * </pre>
 * @name t11e.util.deref
 * @function
 * @param context
 * @param path
 */
t11e.util.deref = function (context, path) {
    var output;
    if (t11e.util.is_undefined(path)) {
        output = undefined;
    } else {
        output = context;
        var parts = path.split('.');
        var part;
        for (var i = 0; i < parts.length && t11e.util.is_defined(output); i++) {
            part = parts[i];
            output = output[part];
        }
    }
    return output;
};

/**
 * @name t11e.util.get_next_number
 * @function
 */
t11e.util.get_next_number = (function () {
    var counter = 0;
    return function () {
        return counter++;
    };
}());

/**
 * Utility function that maps various strings to boolean values <code>true</code>
 * or <code>false</code>:
 *
 * <pre class="brush: js">
 *    var show_criteria_locations = t11e.util.as_boolean(options.show_criteria_locations, false);
 * </pre>
 * @name t11e.util.as_boolean
 * @function
 * @param value
 * @param defaultValue
 */
t11e.util.as_boolean = function (value, defaultValue) {
    var output = defaultValue;
    if (t11e.util.is_defined(value)) {
        if (t11e.util.is_defined(value.toLowerCase)) {
            value = value.toLowerCase();
        }
        switch (value) {
        case 'true':
        case 'yes':
        case '1':
            output = true;
            break;
        case 'false':
        case 'no':
        case '0':
            output = false;
            break;
        }
    }
    return output;
};

/**
 * Log to the console.
 * @name t11e.util.log
 * @function
 */
t11e.util.log = function () {
    t11e.internals.log('log', arguments);
};

/**
 * Log errors to the console.
 * @name t11e.util.error
 * @function
 */
t11e.util.error = function () {
    t11e.internals.log('error', arguments);
};

/**
 * Log warnings to the console.
 * @name t11e.util.warn
 * @function
 */
t11e.util.warn = function () {
    t11e.internals.log('warn', arguments);
};

/**
 * Mechanism for marking methods as deprecated.
 * Use like t11e.util.declare, but with the addition of a reason.
 * Results in the definition of old.function.name.
 * <p>
 * Note that the third argument can either be a function, function name, or undefined.
 * The dot.separated.syntax for function namespaces is supported.
 * <p>
 * Examples:
 * <pre>
 *   t11e.util.deprecated('why', 'old.function.name', 'new.function.name');
 *
 *   t11e.util.deprecated('why', 'old.function.name', function(arg1, argn) { ... });
 * </pre>
 */
t11e.util.deprecated = function (reason, old_function_name, new_function_name) {
    var decorator;
    if (t11e.util.is_undefined(new_function_name)) {
        decorator = function () {
            t11e.util.error('Deprecated method', old_function_name, 'has been removed:', reason);
        };
    } else if (t11e.util.is_function(new_function_name)) {
        /** @ignore */
        decorator = function () {
            t11e.util.warn('Deprecated method', old_function_name, 'called:', reason);
            return new_function_name.apply(this, arguments);
        };
    } else {
        var delegate = t11e.util.deref(window, new_function_name);
        if (t11e.util.is_undefined(delegate)) {
            t11e.util.error('t11e.util.deprecated called with invalid new function name', new_function_name);
        } else {
            /** @ignore */
            decorator = function () {
                t11e.util.warn('Deprecated method', old_function_name, 'called. Delegating to', new_function_name, ':', reason);
                return delegate.apply(this, arguments);
            };
        }
    }
    if (t11e.util.is_defined(decorator)) {
        t11e.util.declare(old_function_name, decorator);
    }
    return decorator;
};

/**
 * Returns true if obj is an array.
 *
 * @name t11e.util.is_array
 * @function
 * @param obj
 * @return boolean
 */
t11e.util.is_array = function (obj) {
    return obj && (obj instanceof Array || typeof obj === 'array');
};

/**
 * Returns true if obj is a function.
 *
 * @name t11e.util.is_function
 * @function
 * @param obj
 * @return boolean
 */
t11e.util.is_function = function (obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
};

if (false) {
    t11e.util.prototype.Eclipse__Outline__Hack = undefined;
}
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview page_controller.js
 */

t11e.util.define_namespace('t11e.widget');
if (false) {
    t11e.widget.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Simple search controller class that performs search, communicating with
 * all the other widgets via the {@link t11e.event} module.
 *
 * Initializing the widgets and page controller is a two step process, as the
 * example below illustrates. In the first step, the widgets themselves are
 * activated by calling {@link t11e.widget.jquery.activate_widgets}. Afterwards
 * the page controller is activated by calling {@link t11e.widget.activate_search_page}
 * is called, along with it's configuration options.
 *
 *<pre class="brush: js">
 * &lt;script type=&quot;text/javascript&quot;&gt;//&lt;![CDATA[
 *     (function ($) {
 *         t11e.widget.jquery.activate_widgets($);
 *         var options = {
 *                      &quot;search_groups&quot;: {
 *                          &quot;vehicle&quot;: {
 *                              &quot;url&quot;: &quot;/discovery_search/30/search/50&quot;
 *                          }
 *                      }
 *                  };
 *         options.history_plugin = t11e.widget.jquery.history_plugin($);
 *         options.search_plugin = t11e.widget.jquery.search_plugin($);
 *         t11e.widget.activate_search_page(options);
 *     }(jQuery));
 * //]]&gt;&lt;/script&gt;
 * </pre>
 *
 * <h2>Events:</h2>
 * The search controller manages the search request/response process by
 * implementing the following events.
 *
 * <dl>
 * <dt>perform_search</dt>
 * <dd>
 * The <code>perform_search</code> is usually triggered by the page controller
 *  when the search parameters have been updated, requiring a
 * new search to be executed. It does not guarantee that a search will be
 * executed, because it checks certain conditions to see if it actually needs to
 * perform a new search (for example, if the search parameters haven't
 * actually changed).
 *
 * <pre class="brush: js">
 *     t11e.event.subscribe('perform_search', callback);
 *     t11e.event.trigger('perform_search');
 * </pre>
 * </dd>
 * <dt>searching.{search_group}</dt>
 * <dd>The <code>searching</code> event is triggered after the <code>perform_search</code>
 * only when a search is actually going to be executed (see
 * <a href="src/discovery_widget_media_apps_discovery_widget_js_jquery_search_plugin.js.html">
 * search_plugin.js</a>).The {@link t11e.widget.jquery.ResultsWidget} subscribes
 * to this event in order to display a 'loading' spinner when the search starts.
 *
 * <pre class="brush: js">
 *     t11e.event.subscribe('searching.' + search_group, show_loading);
 *     t11e.event.trigger('searching.' + group_name);
 * </pre>
 * </dd>
 *
 * <dt>request.{search_group}</dt>
 * <dd>Widget's subscribe to this event in order to update their state based upon
 * the current search parameters. This allows the widget to update itself when
 * the back button is pushed, or if it's listening for the same parameter as
 * another widget.
 *
 * <pre class="brush: js">
 *     t11e.event.subscribe('request.' + search_group, callback);
 *     t11e.event.trigger('request.' + group_name, copy_of_request);
 * </pre>
 *
 * See {@link t11e.widget.jquery.SliderWidget-load_from_params} for an example
 * callback function used with the <code>request</code> event.
 * </dd>
 *
 * <dt>update_request.{search_group}</dt>
 * <dd>Widgets trigger <code>update_request</code> when their values have
 * changed. For example, when a slider has been slid to a new value, the
 * <code>update_request</code> event is triggered. The
 * <code>perform_search</code> event is subsequently called by the page
 * controller (
 * <a href="src/discovery_widget_media_apps_discovery_widget_js_page_controller.js.html">
 * page_controller.js</a>).
 *<pre class="brush: js">
 *     t11e.event.subscribe('update_request',
 *         make_group_update_request_handler());
 *     t11e.event.trigger('update_request.' + search_group, save_to_params);
 *</pre>
 * See {@link t11e.widget.jquery.SliderWidget-save_to_params} for an example
 * callback function used with the <code>update_request</code> event.
 * </dd>
 * <dt>response.{search_group}
 * response_error.{search_group}</dt>
 * <dd>The search plugin
 * (<a href="src/discovery_widget_media_apps_discovery_widget_js_jquery_search_plugin.js.html">
 * search_plugin.js</a>) triggers a
 * <code>response.{search_group}</code> event when a response to a search is
 * received and a <code>response_error.{search_group}</code> when the search
 * fails for any reason. The {@link t11e.widgets.jquery.ResultsWidget}
 * subscribes to these events in order to display the search results.
 * <pre class="brush: js">
 *    t11e.event.subscribe('response.' + search_group, update_from_response);
 *    t11e.event.subscribe('response_error.' + search_group,
 *        function (error) {});
 *    t11e.event.trigger('response.' + group_name, response);
 *    t11e.event.trigger('response_error.' + group_name, event);
 * </pre>
 * See {@link t11e.widget.jquery.ResultsWidget-update_from_response} for an example
 * callback function used with the <code>response</code> event.
 * </dd>
 * <dt>reset_search,
 * clear_search,
 * clear_params_from_search.{search_group}
 * <dd>These two events are defined in page_controller.js. They are used in
 * {@link t11e.widget.jquery.ButtonWidget} to create "clear search" buttons and
 * "reset search" buttons. Resetting the search causes it to revert to its
 * previous state whereas clearing the search removes all the parameters. These
 * events trigger the <code>clear_params_from_search.{search_group}</code>
 * event, which widgets should subscribe to in order to clear their values when
 * either of these events are triggered.
 *
 * <pre class="brush: js">
 *    t11e.event.subscribe('reset_search', function (do_not_search) {});
 *    t11e.event.subscribe('clear_search.' + group_name,
 *    t11e.event.subscribe('clear_params_from_search.' + search_group,
 *        clear_params_from_search);
 *    t11e.event.trigger('clear_params_from_search.' + group_name,
 *        filtered_copy_of_pending_request);
 * </dd>
 * </dl>
 *
 * @param {Object} options Configuration options for search_groups,
 * history_plugin and search_plugin.
 */
t11e.widget.activate_search_page = function (/**Object*/options) {
    /**
     * Setup initial state.
     */
    var history_plugin = options.history_plugin || {
        'get_initial_state': function () {
            return {};
        },
        'update': function (state) {
            // Do nothing
        }
    };
    /**
     * Set up search plugin
     */
    var search_plugin = options.search_plugin || {
        'search': function (group_name, options, state) {
            // Do nothing
        }
    };
    /** search params object, retrieved from the history plugin.*/
    var pending_request = history_plugin.get_initial_state();
    var debug_state = options.debug_state || /debug_state/.test(window.location.search);
    if (debug_state) {
        t11e.util.log('[DEBUG_STATE] State from history',
            pending_request, t11e.util.encode_params(pending_request));
    }
    var last_searched = '';
    var initial_search;
    var searchers = [];

    var perform_search = function (from_history) {
        if (!from_history) {
            var copy_of_request =
                t11e.util.decode_params(t11e.util.encode_params(pending_request));
            history_plugin.update(copy_of_request);
        }
        var encoded_request = t11e.util.encode_params(pending_request);
        if (last_searched !== encoded_request) {
            last_searched = encoded_request;
            for (var i = 0; i < searchers.length; i++) {
                var searcher = searchers[i];
                try {
                    searcher(pending_request, true);
                } catch (e) {
                    t11e.util.error('Problem performing search.', searcher, e);
                }
            }
        }
    };

    var make_group_searcher = function (group_name, options) {
        var last_group_search = undefined;
        t11e.event.subscribe('response_error.' + group_name, function () {
            last_group_search = undefined;
        });
        return function (request, performSearch) {
            var new_search = t11e.util.encode_params(request, options.param_names);
            if (new_search !== last_group_search) {
                last_group_search = new_search;
                var copy_of_request = t11e.util.decode_params(new_search);
                t11e.event.trigger('request.' + group_name, copy_of_request);
                if (performSearch) {
                    copy_of_request = t11e.util.decode_params(new_search);
                    search_plugin.search(group_name, options, copy_of_request);
                }
            }
        };
    };

    var update_group_request = function (updated_request, param_names) {
        updated_request = t11e.util.decode_params(
            t11e.util.encode_params(updated_request, param_names));

        // Purpose: Keep parameters from other search groups in the
        // global history.
        var new_request;
        if (t11e.util.is_undefined(param_names)) {
            new_request = {};
        } else {
            new_request = t11e.util.decode_params(
                t11e.util.encode_params(pending_request));
            t11e.internals.remove_from_map(new_request, param_names);
        }
        t11e.internals.update_map(new_request, updated_request);
        pending_request = new_request;
    };

    var make_group_update_request_handler = function (param_names) {
        return function (callback, do_not_search) {
            var filtered_copy_of_pending_request = t11e.util.decode_params(
              t11e.util.encode_params(pending_request, param_names));
            var updated_request = callback(filtered_copy_of_pending_request);
            if (t11e.util.is_undefined(updated_request)) {
                // Callback didn't return a dictionary so assume it modified the
                // state inplace.
                updated_request = filtered_copy_of_pending_request;
            }
            update_group_request(updated_request, param_names);
            if (!do_not_search) {
                t11e.event.trigger('perform_search');
            }
        };
    };

    var make_group_clear_search_handler = function (group_name, param_names) {
        return function (do_not_search) {
            var filtered_copy_of_pending_request = t11e.util.decode_params(
                    t11e.util.encode_params(pending_request, param_names));
            t11e.event.trigger('clear_params_from_search.' + group_name, filtered_copy_of_pending_request);
            update_group_request(filtered_copy_of_pending_request, param_names);
            if (!do_not_search) {
                t11e.event.trigger('perform_search');
            }
        };
    };

    t11e.event.subscribe('reset_search', function (do_not_search) {
        pending_request = t11e.util.decode_params(initial_search);
        if (!do_not_search) {
            t11e.event.trigger('perform_search');
        }
    });

    /**
     * Hook up all the event handling.
     */
    (function () {
        if (t11e.util.is_defined(options.search_groups)) {
            var group_names = t11e.internals.get_keys(options.search_groups);
            var search_opts, group_name;
            for (var i = 0; i < group_names.length; ++i) {
                group_name = group_names[i];
                search_opts = options.search_groups[group_name];
                searchers.push(make_group_searcher(group_name, search_opts));
                t11e.event.subscribe('update_request.' + group_name,
                    make_group_update_request_handler(search_opts.param_names));
                t11e.event.subscribe('clear_search.' + group_name,
                        make_group_clear_search_handler(group_name, search_opts.param_names));

            }
        }
    }());
    t11e.event.subscribe('update_request', make_group_update_request_handler());
    t11e.event.subscribe('perform_search', perform_search);
    /**
     * Fire events for initial page load.
     */
    var ajax_history_state = t11e.util.encode_params(pending_request);
    if (debug_state) {
        t11e.util.log('[DEBUG_STATE] ajax_history_state:', ajax_history_state);
    }

    (function () {
        if (t11e.util.is_defined(options.search_groups)) {
            var make_identity_callback = function (a) {
                return function () {
                    return a;
                };
            };
            var group_names = t11e.internals.get_keys(options.search_groups);
            var group_name, parameters;
            for (var i = 0; i < group_names.length; ++i) {
                group_name = group_names[i];
                parameters = options.search_groups[group_name].parameters;
                if (t11e.util.is_defined(parameters)) {
                    t11e.event.trigger('update_request.' + group_name,
                        make_identity_callback(parameters), true);
                }
            }
        }
    }());

    if (debug_state) {
        t11e.util.log('[DEBUG_STATE] After processing search group options',
            pending_request, t11e.util.encode_params(pending_request));
    }
    initial_search = t11e.util.encode_params(pending_request);
    if (ajax_history_state !== '') {
        if (debug_state) {
            t11e.util.log('[DEBUG_STATE] from ajax history, so setting empty previous search');
        }
        pending_request = t11e.util.decode_params(ajax_history_state);
        last_searched = '';
        t11e.event.trigger('perform_search', true);
    } else {
        if (debug_state) {
            t11e.util.log('[DEBUG_STATE] not from ajax history, so calling searchers');
        }
        last_searched = initial_search;
        (function () {
            for (var j = 0; j < searchers.length; j++) {
                searchers[j](pending_request, false);
            }
            if (t11e.util.is_defined(options.search_groups)) {
                var group_names = t11e.internals.get_keys(options.search_groups);
                var group_name, response;
                for (var i = 0; i < group_names.length; ++i) {
                    group_name = group_names[i];
                    response = options.search_groups[group_name].response;
                    if (t11e.util.is_defined(response) && response !== null) {
                        t11e.event.trigger('response.' + group_name, response);
                    }
                }
            }
        }());
    }
    if (debug_state) {
        t11e.util.log('[DEBUG_STATE] initial_search', initial_search);
    }
};
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview t11e.widget.jquery.search_plugin
 *
 * <p>jQuery ajax search request</p>
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Returns a search object that manages Ajax search requests. It triggers
 * either a response event or a response_error event.
 * @name t11e.widget.jquery.search_plugin
 * @class Search plugin that uses jQuery to execute the Ajax search request.
 */
t11e.widget.jquery.search_plugin = function ($) {
    return {
        'search': function (group_name, options, state) {
            t11e.event.trigger('searching.' + group_name);
            $.ajax({
                url: options.url,
                data: t11e.util.encode_params(state),
                dataType: 'json',
                success: function (response, status) {
                    t11e.event.trigger('response.' + group_name, response);
                },
                error: function (response, status, error) {
                    var data = {
                        status: response.status,
                        statusText: response.statusText,
                        responseText: response.responseText
                    };
                    t11e.event.trigger('response_error.' + group_name, data);
                }
            });
        }
    };
};
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview t11e.widget.jquery.history_plugin
 *
 * <p>jQuery based history plugin for the search controller. It uses the
 * AjaxSoft history plugin.</p>
 */

/**
 * Returns a history object that manages search history and provides
 * back-button support.
 *
 * @name t11e.widget.jquery.history_plugin
 * @class
 */
t11e.util.declare('t11e.widget.jquery.history_plugin', function ($) {

    /**
     * Listen to url hash changes, don't worry about propagating the same
     * change multiple times as the search controller will check that for
     * us.
     *
     * When we see a change we trigger the update_request event and then
     * the perform_search event.
     */
    $.history(function (e, ui) {
        t11e.event.trigger('update_request', function (state) {
            var new_state = t11e.util.decode_params(ui.value.replace(/^&/, ''));
            return new_state;
        }, true);
        t11e.event.trigger('perform_search', true);
    });

    var plugin = {
        /**
         * Whenever a search is about to be performed that should be
         * recorded in history this function is called. It alters the
         * url hash and thus hashchanged will get fired but the controller
         * will correctly work around that.
         * @function
         * @param state
         */
        'update': function (state) {
            var serialized_state = '&' + t11e.util.encode_params(state);
            // TODO On IE6 do a check here to make sure the generated URL
            // isn't so long that it crashes the browser.
            $.history('add', serialized_state);
        },

        /**
         * The controller calls this during the initial page load to extract
         * any pre-existing search state from the history plugin. Should
         * return the empty map if there is none.
         * @function
         */
        'get_initial_state': function () {
            var initial_hash = window.top.location.hash.replace('#', '').replace(/^&/, '');
            var state = t11e.util.decode_params(initial_hash);
            if ($.browser.msie && parseInt($.browser.version, 10) < 8) {
                plugin.update(state);
            }
            return state;
        }
    };
    return plugin;
});
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview t11e.widget.jquery.util
 */

/**
 * @name jQuery
 * @namespace jQuery: See <a href="http://docs.jquery.com">external documentation</a>
 */

/**
 * @name jQuery.ui
 * @namespace jQuery UI: See <a href="http://docs.jquery.com">external documentation</a>
 */

/**
 * @name t11e.widget.jquery.util
 * @namespace t11e.widget.jquery.util
 */

t11e.util.define_namespace('t11e.widget.jquery.util');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
    t11e.widget.jquery.util.prototype.Eclipse__Outline__Hack = undefined;
}

t11e.widget.jquery.util.call_func = function ($, value, func) {
    if (t11e.util.is_defined(func) &&
        t11e.util.is_function(func)) {
        return func($, value);
    } else {
        return value;
    }
};

/**
 * Automatically find any labels and associates them with the first input
 * inside the given container.
 */
t11e.widget.jquery.util.associate_labels = function ($, container) {
    var input = $(container).find('input:first');
    var input_id = input.attr('id');
    if ('' === input_id) {
        input_id = 't11e-widget-counter-' + t11e.util.get_next_number();
        input.attr('id', input_id);
    }
    $(container).find('label').each(function (i, label) {
        if ('' === $(label).attr('for')) {
            $(label).attr('for', input_id);
        }
    });
};

t11e.widget.jquery.util.remove_checkbox_values_from_params = function ($, checkboxes, params, value_param) {
    var values = params[value_param];
    if (t11e.util.is_defined(values)) {
        var values_to_remove = checkboxes.map(function (checkbox) {
            return checkbox.value;
        });
        params[value_param] =
            t11e.widget.jquery.util.subtract($, values, values_to_remove);
    }
};
t11e.util.deprecated(
    'Misspelled method name',
    't11e.widget.jquery.util.remove_checkboxe_values_from_params',
    't11e.widget.jquery.util.remove_checkbox_values_from_params');

t11e.widget.jquery.util.subtract = function ($, firstArray, secondArray) {
    var output = $.grep(firstArray, function (value, idx) {
        return ! $.inArray(value, secondArray);
    });
    return output;
};

t11e.widget.jquery.util.get_dimension_drilldown = function ($, search, dimension, get_fuzzy_counts) {
    var facet_counts = {};
    var found = false;
    var drillDown = t11e.util.deref(search, '_discovery.response.drillDown');
    if (t11e.util.is_defined(drillDown)) {
        $(drillDown).each(function (i, criterion) {
            if (!found && dimension === criterion.dimension) {
                found = true;
                var ids = criterion.ids;
                var counts = get_fuzzy_counts ? criterion.fuzzyCounts : criterion.exactCounts;
                var j;
                for (j = 0; j < ids.length && j < counts.length; j++) {
                    var id = ids[j];
                    var count = counts[j];
                    facet_counts[id] = count;
                }
            }
        });
    }
    return facet_counts;
};
t11e.util.deprecated(
    'Misspelled method name',
    't11e.widget.jquery.util.get_dimenion_drilldown',
    't11e.widget.jquery.util.get_dimension_drilldown');

t11e.widget.jquery.util.apply_template = function ($, template_string, props) {
    var result = undefined;
    if (t11e.util.is_defined($.template) &&
            t11e.util.is_defined(template_string) &&
            '' !== $.trim(template_string)) {
        result = $.template(template_string).apply(props);
    }
    return result;
};

/**
 * Creates a 't11e-widget-id' attribute on the widgets base
 * 'div' element and sets the appropriate widget id value.
 */
t11e.widget.jquery.util.bind_widget_id = function ($) {
    if (t11e.util.is_undefined($(this).attr('t11e-widget-id'))) {
        /*jslint regexp: false */
        var matches = /t11e-widget-id-([^ ]+)/.exec($(this).attr('class'));
        if (matches && matches.length === 2) {
            var fake_class = matches[0];
            var widget_id = matches[1];
            $(this).removeClass(fake_class);
            $(this).attr('t11e-widget-id', widget_id);
        }
    }
};

/**
 * Creates a jQuery UI widget out of a traditional style Discovery Widget.
 */
t11e.widget.jquery.make_jquery_ui_widget = function ($, ui_name, widget) {
    $.widget('ui.' + ui_name, {});
    /*jslint nomen: false */
    $.ui[ui_name].prototype._init = function () {
        widget.call(this.element[0], $, this.options);
    };
};

/**
 * Calls jQuery.serializeArray on the form and then flattens it into
 * a simple multi-map.
 */
t11e.widget.jquery.serialize_form = function ($, form) {
    var result = {};
    $.each($(form).serializeArray(), function (i, field) {
        if (t11e.util.is_defined(field.value)) {
            var old_value = result[field.name];
            if (t11e.util.is_defined(old_value)) {
                if (t11e.util.is_array(old_value)) {
                    old_value.push(field.value);
                } else {
                    result[field.name] = [old_value, field.value];
                }
            } else {
                result[field.name] = field.value;
            }
        }
    });
    return result;
};
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_slider definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Single handled slider widget.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>css_class</dt>
 *    <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>title</dt>
 *    <dd>The widget's title, which is displayed on the page.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group this widget is associated with.</dd>
 *
 *    <dt>param</dt>
 *    <dd>The query parameter this widget is associated with.</dd>
 *
 *    <dt>min_value</dt>
 *    <dd>The minimum value for the slider range.</dd>
 *
 *    <dt>max_value</dt>
 *    <dd>The maximum value for the slider range.</dd>
 *
 *    <dt>step</dt>
 *    <dd>The increment value for the slider. The default is '1'.</dd>
 *
 *    <dt>page_param</dt>
 *    <dd>Causes the pagination widget to reset when when this widget is updated. The 'page_param' value
 *    must be set to the same as the pagination widget's 'page_param' value.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-slider">
 *     <div class="t11e-hd t11e-widget-jquery-slider-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-slider-bd">
 *       <div class="amount"></div>
 *       <div class="slider-control"></div>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-slider-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_slider({
 *       "search_group": "default",
 *       "param": "rating",
 *       "min_value": 0,
 *       "max_value": 5
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.SliderWidget.
 *
 * @name jQuery.ui.t11e_slider
 * @class A single-handled slider.
 */
t11e.widget.jquery.SliderWidget = function ($, options) {
    var search_group = options.search_group;
    var amount = $(this).find('.amount:first');
    var slider_ctl = $(this).find('.slider-control:first');
    var slider_options = {
        'min': Number(options.min_value),
        'max': Number(options.max_value),
        'step': Number(options.step) > 0 ? Number(options.step) : 1
    };
    slider_ctl.slider(slider_options);
    var update_amounts = function (event, ui) {
        amount.html(ui.value);
    };
    slider_ctl.bind('slide', update_amounts);
    update_amounts(null, slider_options);

    var ignore_event = false;
    /* @scope t11e.widget.jquery.SliderWidget */
    /*
     * This function is used as a callback for the <code>request</code> event and it is
     * used to update the slider's state from the current search parameters
     * object. The new value is read from the <code>params</code> object and the slider
     * updated accordingly. See {@link t11e.widget.activate_search_page } for a
     * complete list of events.
     * @param params
     */
    var load_from_params = function (params) {
        var values = params[options.param];
        var value = (t11e.util.is_defined(values) && values.length > 0) ? values[0] : 0;
        if (value !== slider_ctl.slider('value')) {
            ignore_event = true;
            try {
                slider_ctl.slider('value', value);
            } finally {
                ignore_event = false;
            }
            update_amounts(null, {'value': value});
        }
    };
    t11e.event.subscribe('request.' + search_group, load_from_params);

    /* @scope t11e.widget.jquery.SliderWidget */
    /*
     * This function is used as a callback for the <code>update_request</code> event.
     * It takes a single argument, which is the search parameters object,
     * a mapping of search parameters to their values. The function sets the
     * value of the parameter from the <code>options.param</code> variable with the slider's
     * current value. Whenever the search criteria gets updated, any pagination
     * widgets on the page need to be reset. In this case, the slider widget
     * removes the <code>options.page_param</code> value from the search parameters object.
     * See {@link t11e.widget.activate_search_page } for a
     * complete list of events.
     * @function
     * @param params Search parameters
     */
    var save_to_params = function (params) {
        var value = slider_ctl.slider('value');
        params[options.param] = [value];
        t11e.util.remove_param(params, options.page_param);
    };

    slider_ctl.bind('slidechange', function (event, ui) {
        if (!ignore_event) {
            t11e.event.trigger('update_request.' + search_group, save_to_params);
        }
    });

    var clear_params_from_search = function (params) {
        t11e.util.remove_param(params, options.param);
        t11e.util.remove_param(params, options.page_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_slider', t11e.widget.jquery.SliderWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_faceted_slider definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Single handled slider widget.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>css_class</dt>
 *    <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>title</dt>
 *    <dd>The widget's title, which is displayed on the page.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group this widget is associated with.</dd>
 *
 *    <dt>param</dt>
 *    <dd>The query parameter this widget is associated with.</dd>
 *
 *    <dt>min_value</dt>
 *    <dd>The minimum value for the slider range.</dd>
 *
 *    <dt>max_value</dt>
 *    <dd>The maximum value for the slider range.</dd>
 *
 *    <dt>step</dt>
 *    <dd>The increment value for the slider. The default is '1'.</dd>
 *
 *    <dt>min_is_any</dt>
 *    <dd>When set to 'true', the minimum value on the slider is set to match any value, which
 *    is a way of disabling the slider so it is no longer part of the search.</dd>
 *
 *    <dt>page_param</dt>
 *    <dd>Causes the pagination widget to reset when when this widget is updated. The 'page_param' value
 *    must be set to the same as the pagination widget's 'page_param' value.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-slider">
 *     <div class="t11e-hd t11e-widget-jquery-slider-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-slider-bd">
 *       <div class="t11e-facets"></div>
 *       <div class="t11e-amount"></div>
 *       <div class="t11e-slider-control"></div>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-slider-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_faceted_slider({
 *       "search_group": "default",
 *       "param": "rating",
 *       "min_value": 0,
 *       "max_value": 5
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.FacetedSliderWidget.
 *
 * @name jQuery.ui.t11e_faceted_slider
 * @class A single-handled slider.
 */
t11e.widget.jquery.FacetedSliderWidget = function ($, options) {
    var search_group = options.search_group;
    var dimension = options.dimension;
    var min_is_any = t11e.util.is_defined(options.min_is_any) ? options.min_is_any : false;
    var facets = $(this).find(".t11e-facets:first");
    var amount = $(this).find(".t11e-amount:first");
    var slider_ctl = $(this).find(".t11e-slider-control:first");
    var slider_options = {
        'min': Number(options.min_value),
        'max': Number(options.max_value),
        'step': Number(options.step) > 0 ? Number(options.step) : 1
    };
    slider_ctl.slider(slider_options);

    var value_to_param = function (value) {
        return t11e.widget.jquery.util.call_func($, value, options.value_to_param);
    };

    var param_to_value = function (param) {
        return parseFloat(t11e.widget.jquery.util.call_func($, param, options.param_to_value));
    };

    var update_amounts = function (event, ui) {
        var value;
        if (t11e.util.is_defined(ui.value)) {
            if (min_is_any && ui.value === slider_options.min) {
                value = '';
            } else {
                value = value_to_param(ui.value);
            }
        }
        if (t11e.util.is_defined(options.format) &&
            t11e.util.is_function(options.format)) {
            options.format($, amount, value);
        }
        else {
            amount.html(value);
        }
    };

    slider_ctl.bind('slide', update_amounts);
    update_amounts(null, slider_options);

    var ignore_event = false;
    /*
     * This function is used as a callback for the <code>request</code> event and it is
     * used to update the slider's state from the current search parameters
     * object. The new value is read from the <code>params</code> object and the slider
     * updated accordingly. See {@link t11e.widget.activate_search_page } for a
     * complete list of events.
     * @param params
     */
    var load_from_params = function (params) {
        var param_values = params[options.param];
        var slider_value;
        if (t11e.util.is_defined(param_values) && param_values.length > 0) {
            //var param_value = (t11e.util.is_defined(values) && values.length > 0) ? values[0] : 0;
            slider_value = param_to_value(param_values[0]);
        } else {
            slider_value = slider_options.min;
        }
        if (slider_value !== slider_ctl.slider('value')) {
            ignore_event = true;
            try {
                slider_ctl.slider('value', slider_value);
            } finally {
                ignore_event = false;
            }
            update_amounts(null, {'value': slider_value});
        }

    };
    t11e.event.subscribe('request.' + search_group, load_from_params);

    /*
     * This function is used as a callback for the <code>update_request</code> event.
     * It takes a single argument, which is the search parameters object,
     * a mapping of search parameters to their values. The function sets the
     * value of the parameter from the <code>options.param</code> variable with the slider's
     * current value. Whenever the search criteria gets updated, any pagination
     * widgets on the page need to be reset. In this case, the slider widget
     * removes the <code>options.page_param</code> value from the search parameters object.
     * See {@link t11e.widget.activate_search_page } for a
     * complete list of events.
     * @function
     * @param params Search parameters
     */
    var save_to_params = function (params) {
        var value = slider_ctl.slider('value');
        var param = value_to_param(value);
        if (min_is_any && value === slider_options.min) {
            // Remove parameter
            t11e.util.remove_param(params, options.param);
        } else {
            params[options.param] = [param];
        }
        t11e.util.remove_param(params, options.page_param);
    };

    slider_ctl.bind('slidechange', function (event, ui) {
        if (!ignore_event) {
            t11e.event.trigger('update_request.' + search_group, save_to_params);
        }
    });

    var clear_params_from_search = function (params) {
        t11e.util.remove_param(params, options.param);
        t11e.util.remove_param(params, options.page_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_faceted_slider', t11e.widget.jquery.FacetedSliderWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_dual_slider definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

 /**
 * A dual-handled slider widget.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>css_class</dt>
 *    <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>title</dt>
 *    <dd>The widget's title, which is displayed on the page.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group this widget is associated with.</dd>
 *
 *    <dt>min_param</dt>
 *    <dd>The query parameter this widget is associated with.</dd>
 *
 *    <dt>max_param</dt>
 *    <dd>The query parameter this widget is associated with.</dd>
 *
 *    <dt>min_value</dt>
 *    <dd>The minimum value for the slider range.</dd>
 *
 *    <dt>max_value</dt>
 *    <dd>The maximum value for the slider range.</dd>
 *
 *    <dt>step</dt>
 *    <dd>The increment value for the slider. The default is '1'.</dd>
 *
 *    <dt>page_param</dt>
 *    <dd>Causes the pagination widget to reset when when this widget is updated. The 'page_param' value
 *    must be set to the same as the pagination widget's 'page_param' value.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-dual-slider">
 *     <div class="t11e-hd t11e-widget-jquery-dual-slider-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-dual-slider-bd">
 *       <div class="amount"></div>
 *       <div class="slider-control"></div>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-dual-slider-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_dual_slider({
 *       "search_group": "default",
 *       "min_param": "year_min",
 *       "max_param": "year_max",
 *       "min_value": 1960,
 *       "max_value": 2010
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.DualSliderWidget.
 *
 * @name jQuery.ui.t11e_dual_slider
 * @class A dual-handled slider widget for searching a range of values.
 */
t11e.widget.jquery.DualSliderWidget = function ($, options) {
    var search_group = options.search_group;
    var amount = $(this).find(".amount:first");
    var slider_ctl = $(this).find(".slider-control:first");
    var slider_options = {
        'range': true,
        'values': [Number(options.min_value), Number(options.max_value)],
        'min': Number(options.min_value),
        'max': Number(options.max_value),
        'step': Number(options.step) > 0 ? Number(options.step) : 1
    };
    slider_ctl.slider(slider_options);
    var update_amounts = function (event, ui) {
        amount.html(ui.values[0] + ' - ' + ui.values[1]);
    };
    slider_ctl.bind('slide', update_amounts);
    update_amounts(null, slider_options);

    var ignore_event = false;
    var load_from_params = function (params) {
        var min_values = params[options.min_param];
        var max_values = params[options.max_param];
        var min_value = (t11e.util.is_defined(min_values) && min_values.length > 0) ?
            min_values[0] : slider_options.min;
        var max_value = (t11e.util.is_defined(max_values) && max_values.length > 0) ?
            max_values[0] : slider_options.max;
        if (t11e.util.is_defined(min_value) && t11e.util.is_defined(max_value)) {
            var old_values = slider_ctl.slider('values');
            if (old_values[0] !== min_value || old_values[1] !== max_value) {
                ignore_event = true;
                try {
                    slider_ctl.slider('values', 0, min_value);
                    slider_ctl.slider('values', 1, max_value);
                    update_amounts(null, {
                        'values': [min_value, max_value]
                    });
                }
                finally {
                    ignore_event = false;
                }
            }
        }
    };
    t11e.event.subscribe('request.' + search_group, load_from_params);

    var save_to_params = function (params) {
        var values = slider_ctl.slider('values');
        params[options.min_param] = [values[0]];
        params[options.max_param] = [values[1]];
        // Reset the pagination parameter so that the new results
        // start on the first page.
        t11e.util.remove_param(params, options.page_param);
    };

    slider_ctl.bind('slidechange', function (event, ui) {
        if (!ignore_event) {
            t11e.event.trigger('update_request.' + search_group, save_to_params);
        }
    });

    var clear_params_from_search = function (params) {
        t11e.util.remove_param(params, options.min_param);
        t11e.util.remove_param(params, options.max_param);
        t11e.util.remove_param(params, options.page_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_dual_slider', t11e.widget.jquery.DualSliderWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_faceted_dual_slider definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

 /**
 * A dual-handled slider widget.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>css_class</dt>
 *    <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>title</dt>
 *    <dd>The widget's title, which is displayed on the page.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group this widget is associated with.</dd>
 *
 *    <dt>min_param</dt>
 *    <dd>The query parameter this widget is associated with.</dd>
 *
 *    <dt>max_param</dt>
 *    <dd>The query parameter this widget is associated with.</dd>
 *
 *    <dt>min_value</dt>
 *    <dd>The minimum value for the slider range.</dd>
 *
 *    <dt>max_value</dt>
 *    <dd>The maximum value for the slider range.</dd>
 *
 *    <dt>step</dt>
 *    <dd>The increment value for the slider. The default is '1'.</dd>
 *
 *    <dt>page_param</dt>
 *    <dd>Causes the pagination widget to reset when when this widget is updated. The 'page_param' value
 *    must be set to the same as the pagination widget's 'page_param' value.</dd>
 *
 *    <dt>value_to_param</dt>
 *    <dd>Optional callback for mapping the slider value to a param value.</dd>
 *
 *    <dt>param_to_value</dt>
 *    <dd>Optional callback for mapping a param value to a slider value.</dd>
 *
 *    <dt>sparkline</dt>
 *    <dd>Configuration for displaying a sparkline (an inline chart) that represents the distribution of
 *    the slider values.</dd>
 *
 *    <dt>format</dt>
 *    <dd>Optional callback that formats how the slider values are displayed on the page.
 *
 *    <dt>min_is_any</dt>
 *    <dd>When set to 'true', the minimum value on the slider is set to match any value. If there is
 *    a max value set for the slider and min_is_any is set to 'true', then the slider is equivalent
 *    to searching for items whose dimension is less than the max value.</dd>
 *
 *    <dt>max_is_any</dt>
 *    <dd>When set to 'true', the maximum value on the slider is set to match any value. If there is
 *    a min value set for the slider and max_is_any is set to 'true', then the slider is equivalent
 *    to searching for items whose dimension is greater than the min value. If both min_is_any and
 *    max_is_any is set to 'true', the slider is not used in the search.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-faceted-dual-slider">
 *     <div class="t11e-hd t11e-widget-jquery-faceted-dual-slider-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-faceted-dual-slider-bd">
 *       <div class="t11e-sparkline"></div>
 *       <div class="t11e-slider-control"></div>
 *       <div class="t11e-amount"></div>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-faceted-dual-slider-ft">
 *     </div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_faceted_dual_slider({
 *       "search_group": "default",
 *       "dimension": "price",
 *       "min_param": "price_min",
 *       "max_param": "price_max",
 *       "min_value": 2,
 *       "max_value": 10,
 *       "sparkline": {
 *         "height": "2em",
 *         "lineWidth": 2,
 *         "background": {
 *           "lineColor": "#AAA",
 *           "fillColor": "#CCC"
 *         },
 *         "foreground": {
 *           "lineColor": "#F66",
 *           "fillColor": "#FAA"
 *         }
 *       },
 *       "value_to_param": function ($, value) {
 *         return Math.pow(Number(value), 3);
 *       },
 *       "param_to_value": function ($, value) {
 *         return Math.ceil(Math.pow(value, 1/3));
 *       },
 *       "format": function ($, amount, min_value, max_value) {
 *         amount.html('$' + min_value + ' - $' + max_value);
 *       }
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.FacetedDualSliderWidget.
 *
 * @name jQuery.ui.t11e_faceted_dual_slider
 * @class A dual-handled slider widget for searching a range of values.
 */
t11e.widget.jquery.FacetedDualSliderWidget = function ($, options) {
    var search_group = options.search_group;
    var dimension = options.dimension;
    var min_is_any = t11e.util.is_defined(options.min_is_any) ? options.min_is_any : false;
    var max_is_any = t11e.util.is_defined(options.max_is_any) ? options.max_is_any : false;
    var sl = $(this).find(".t11e-sparkline:first");
    var amount = $(this).find(".t11e-amount:first");
    var slider_ctl = $(this).find(".t11e-slider-control:first");
    var slider_options = {
        'range': true,
        'values': [Number(options.min_value), Number(options.max_value)],
        'min': Number(options.min_value),
        'max': Number(options.max_value),
        'step': Number(options.step) > 0 ? Number(options.step) : 1,
        'orientation': t11e.util.is_defined(options.orientation) ? options.orientation : 'horizontal'
    };
    slider_ctl.slider(slider_options);

    var value_to_param = function (value) {
        return t11e.widget.jquery.util.call_func($, value, options.value_to_param);
    };

    var param_to_value = function (param) {
        return parseFloat(t11e.widget.jquery.util.call_func($, param, options.param_to_value));
    };

    // TODO: Sparklines should be moved to a plugin
    if (t11e.util.is_defined(options.sparkline) &&
        t11e.util.is_defined(sl) &&
        sl.length > 0 &&
        t11e.util.is_defined(sl.sparkline)) {
        $(this).addClass('t11e-widget-jquery-faceted-dual-slider-sparkline');
        var chart_min = value_to_param(slider_options.min);
        var chart_max = value_to_param(slider_options.max);
        var sl_options = options.sparkline;
        var sl_width = $(this).find('.ui-slider-horizontal').width();
        var sl_config = {
            type: 'line',
            height: t11e.util.is_defined(sl_options.height) ? sl_options.height : "2em",
            width: t11e.util.is_defined(sl_options.width) ? sl_options.width : sl_width,
            lineWidth: t11e.util.is_defined(sl_options.lineWidth) ? sl_options.lineWidth : 2,
            chartRangeMin: chart_min,
            chartRangeMax: chart_max,
            spotColor: '',
            minSpotColor: '',
            maxSpotColor: ''
        };
        var sl_background = $.extend({}, sl_config, sl_options.background);
        var sl_foreground = $.extend({}, sl_config, sl_options.foreground);
        sl_foreground.composite = true;
    }

    var update_amounts = function (event, ui) {
        var min_param_value = value_to_param(ui.values[0]);
        var max_param_value = value_to_param(ui.values[1]);

        if (t11e.util.is_undefined(min_param_value) ||
            (min_is_any && ui.values[0] === slider_options.min)) {
            min_param_value = '';
        }
        if (t11e.util.is_undefined(max_param_value) ||
            (max_is_any && ui.values[1] === slider_options.max)) {
            max_param_value = '';
        }

        if (t11e.util.is_defined(options.format) &&
            t11e.util.is_function(options.format)) {
            options.format($, amount, min_param_value, max_param_value);
        }
        else {
            amount.html(min_param_value + ' - ' + max_param_value);
        }
    };

    var show_sparkline = function (event, ui) {
        if (t11e.util.is_defined(sl) &&
            t11e.util.is_defined(sl_background) &&
            t11e.util.is_defined(sl_foreground)) {
            var min_value = ui.values[0];
            var max_value = ui.values[1];
            var sparkline_values = [];
            var selected = [];
            for (var i = slider_options.min; i <= slider_options.max; i = i + slider_options.step) {
                sparkline_values.push(value_to_param(i));
                if (i >= min_value && i <= max_value) {
                    selected.push(value_to_param(i));
                }
                else {
                    selected.push(null);
                }
            }
            sl.sparkline(sparkline_values, sl_background);
            sl.sparkline(selected, sl_foreground);
        }
    };
    slider_ctl.bind('slide', update_amounts);
    slider_ctl.bind('slide', show_sparkline);
    update_amounts(null, slider_options);
    show_sparkline(null, slider_options);

    var ignore_event = false;
    var load_from_params = function (params) {
        var param_min_values = params[options.min_param];
        var param_max_values = params[options.max_param];
        var slider_min_value;
        var slider_max_value;
        if (t11e.util.is_defined(param_min_values) && param_min_values.length > 0) {
            slider_min_value = param_to_value(param_min_values[0]);
        } else {
            slider_min_value = slider_options.min;
        }
        if (t11e.util.is_defined(param_max_values) && param_max_values.length > 0) {
            slider_max_value = param_to_value(param_max_values[0]);
        } else {
            slider_max_value = slider_options.max;
        }

        if (t11e.util.is_defined(slider_min_value) && t11e.util.is_defined(slider_max_value)) {
            var old_values = slider_ctl.slider('values');
            if (old_values[0] !== slider_min_value || old_values[1] !== slider_max_value) {
                ignore_event = true;
                try {
                    slider_ctl.slider('values', 0, slider_min_value);
                    slider_ctl.slider('values', 1, slider_max_value);
                    update_amounts(null, {
                        'values': [slider_min_value, slider_max_value]
                    });
                    show_sparkline(null, {
                        'values': [slider_min_value, slider_max_value]
                    });
                }
                finally {
                    ignore_event = false;
                }
            }

        }
    };
    t11e.event.subscribe('request.' + search_group, load_from_params);

    var save_to_params = function (params) {
        var values = slider_ctl.slider('values');
        var param_min_value = value_to_param(values[0]);
        var param_max_value = value_to_param(values[1]);
        if (min_is_any && values[0] === slider_options.min) {
            // Remove parameter
            t11e.util.remove_param(params, options.min_param);
        } else {
            params[options.min_param] = [param_min_value];
        }
        if (max_is_any && values[1] === slider_options.max) {
            // Remove parameter
            t11e.util.remove_param(params, options.max_param);
        } else {
            params[options.max_param] = [param_max_value];
        }
        // Reset the pagination parameter so that the new results
        // start on the first page.
        t11e.util.remove_param(params, options.page_param);
    };

    slider_ctl.bind('slidechange', function (event, ui) {
        if (!ignore_event) {
            t11e.event.trigger('update_request.' + search_group, save_to_params);
        }
    });

    var clear_params_from_search = function (params) {
        t11e.util.remove_param(params, options.min_param);
        t11e.util.remove_param(params, options.max_param);
        t11e.util.remove_param(params, options.page_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);

};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_faceted_dual_slider', t11e.widget.jquery.FacetedDualSliderWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_response definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Debug widget that displays the search response as JSON.
 *
 * <h2>Options</h2>
 * <dl>
 *   <dt>search_group</dt>
 *   <dd>The search group from which this widget displays the response.</dd>
 * <dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-response">
 *     <div class="t11e-hd t11e-widget-jquery-response-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-response-bd">
 *       <div class="response"></div>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-response-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *      $("#example").t11e_response({
 *        "search_group": "default"
 *      });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.ResponseWidget.
 *
 * @name jQuery.ui.t11e_response
 * @class Debug widget for displaying search results.
 */
t11e.widget.jquery.ResponseWidget = function ($, options) {
    var search_group = options.search_group;
    var target = $(this).find(".response:first");
    var update_from_error = function (title, error) {
        target.html('<div id="error">' +
                '<div id="title">' + title + '</div>' +
                '<div id="message">' + error.status + ' ' + error.statusText + '</div>' +
                '<div id="errorText">' + error.responseText + '</div>' +
                '</div>');
    };
    t11e.event.subscribe('response_error.' + search_group, function (error) {
        update_from_error('Problem performing search.', error);
    });
    var update_from_response = function (response) {
        target.html('<pre style="overflow:scroll;">' + JSON.stringify(response, null, '  ') + '</pre>');
    };
    t11e.event.subscribe('response.' + search_group, update_from_response);
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_response', t11e.widget.jquery.ResponseWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_results definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Widget that displays AJAX rendered HTML search results.
 *
 * <h2>Options</h2>
 *<dl>
 *    <dt>search_group</dt>
 *    <dd>The search group this widget is associated with.</dd>
 *
 *    <dt>base_url</dt>
 *    <dd>The url the results widget uses to request the rendered search results. The url
 *    is appended with the 'results_query_params' value from the search response.</dd>
 *
 *    <dt>render_params_paths</dt>
 *    <dd>Array of paths under the JSON AJAX response to look for the render parameters.
 *    Defaults to ['results_query_params', '_discovery.response.renderParameters'].</dd>
 *
 *    <dt>animation_length_ms</dt>
 *    <dd>The number of milliseconds to fade in and out the 'loading' message.
 *    Defaults to 150.</dd>
 *
 *    <dt>container_opacity</dt>
 *    <dd>The opacity (between 0 and 1) of the results content area during a search.
 *    Defaults to 0.5.</dd>
 *
 *    <dt>center_horizontally</dt>
 *    <dd>Centers the 'loading' message horizontally relative to the view port. Otherwise
 *    the 'loading' message is centered relative to the widget. Defaults to false.</dd>
 *
 *    <dt>center_vertically</dt>
 *    <dd>Centers the 'loading' message vertically in the view port. Otherwise, it is
 *    displayed at the top of the view port. Defaults to true.</dd>
 *
 *    <dt>z_index</dt>
 *    <dd>The z-index of the 'loading' message to insure it displays on top of other
 *    elements. Defaults to 1000.</dd>
 *
 *    <dt>highlight_filter</dt>
 *    <dd>An array of jQuery selectors that enclose keyword text to be highlighted
 *    in the results. <p>Note: Highlighting is only enabled if the query request requests
 *    "textTokens" for the "explain" key <i>and</i> at least one valid highlight_filter
 *    has been declared.</p></dd>
 *
 *    <dt>highlight_template</dt>
 *    <dd>An HTML template that will wrap around highlighted keywords found in text
 *    enclosed by the selectors in highlist_filter. Defaults to &lt;span class="highlight"/&gt;</dd>
 *
 *    <dt>results_callback</dt>
 *    <dd>An callback function(target,search){} that is executed when the after the search results
 *    fire.</dd>
 *</dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-results">
 *     <div class="t11e-hd t11e-widget-jquery-results-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-results-bd">
 *       <div class="t11e-results"></div>
 *       <div class="t11e-widget-jquery-results-loading"></div>
 *     </div>
 *    <div class="t11e-ft t11e-widget-jquery-results-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_results({
 *       "search_group": "default",
 *       "base_url": "/results"
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.ResultsWidget.
 *
 * @name jQuery.ui.t11e_results
 * @class Executes Ajax request and renders search results.
 */
t11e.widget.jquery.ResultsWidget = function ($, options) {
    var search_group = options.search_group;
    var base_url = options.base_url;
    var render_params_paths = options.render_params_paths;
    if ((!t11e.util.is_array(render_params_paths)) || render_params_paths.length === 0) {
        render_params_paths = ['results_query_params', '_discovery.response.renderParameters'];
    }
    var animation_length_ms = options.animation_length_ms || 150;
    var container_opacity = options.container_opacity || 0.5;
    var center_horizontally = options.center_horizontally || false;
    var center_vertically = options.center_vertically || true;
    var z_index = options.z_index || 1000;
    var highlight_template = options.highlight_template || '<span class="highlight"/>';
    var results_callback = options.results_callback;
    if (!t11e.util.is_function(results_callback)) {
        results_callback = t11e.util.deref(window, results_callback);
    }

    var target = $(this).find('.t11e-results:first');
    var container = $(this).find('.t11e-widget-jquery-results-bd:first');
    var loading = $(this).find('.t11e-widget-jquery-results-loading:first');

    var update_from_error = function (title, error) {
        if (t11e.util.is_defined(target) && target.length !== 0) {
            target.html('<div class="t11e-error">' +
            '<div class="t11e-error-title">' +
            title +
            '</div>' +
            '<div class="t11e-error-message">' +
            error.status +
            ' ' +
            error.statusText +
            '</div>' +
            '<div class="t11e-error-text">' +
            error.responseText +
            '</div>' +
            '</div>');
        } else {
            t11e.util.error(error.status + ' ' +
                error.statusText + ' ' +
                error.responseText);
        }
    };
    t11e.event.subscribe('response_error.' + search_group, function (error) {
        update_from_error('Problem performing search.', error);
        hide_loading();
    });

    /* @scope t11e.widget.jquery.ResultsWidget */
   /*
    * This function is used as a callback for the <code>response</code> event. It takes
    * one parameter, the search response object. The search response object
    * consists of the original request, the response from the Discovery Engine&trade;
    * and <code>search.results_query_params</code>, which is a query string that contains
    * the itemIds of the items returned in the response. The query string is appended
    * to the <code>base_url</code> variable to form the URL for a second HTTP request to the
    * server to retrieve the displayed results of the response. See
    * {@link t11e.widget.activate_search_page } for a complete list of events.
    *
    * @function
    * @param search The search response object
    */
    var update_from_response = function (search) {
        var query_params;
        $.each(render_params_paths, function (idx, value) {
            query_params = t11e.util.deref(search, value);
            return t11e.util.is_undefined(query_params);
        });
        if (t11e.util.is_undefined(target) ||
            target.length === 0) {
            t11e.util.error('No element has been defined to display results.');
            hide_loading();
        } else if (t11e.util.is_undefined(query_params)) {
            t11e.util.error('query_params cannot be determined from', render_params_paths);
            hide_loading();
        } else {
            var url = base_url + '?' + query_params;
            target.load(url, null, function (responseText, statusText, xhr) {
                if (xhr.status < 200 || xhr.status >= 300) {
                    update_from_error('Problem rendering results.', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: responseText
                    });
                }
                else
                {
                    highlight_text(target, t11e.util.deref(search, '_discovery.response'));
                    if (t11e.util.is_defined(results_callback)) {
                        results_callback(target, search);
                    }
                }
                hide_loading();
            });
        }
    };
    t11e.event.subscribe('response.' + search_group, update_from_response);

    /*
     * Shows the loading popup if the widget contains a div of
     * class <code>t11e-widget-jquery-results-loading</code>.
     */
    var show_loading = function () {
        if (t11e.util.is_defined(loading) && loading.length !== 0 &&
            t11e.util.is_defined(container) && container.length !== 0) {
            /*
             * Position the 'loading' display horizontally relative to the
             * document or the container element.
             */
            var center;
            if (center_horizontally) {
                center = $(document).width() / 2;
            }
            else {
                center = container.offset().left + (container.width() / 2);
            }
            var left = center - (loading.width() / 2);

            /*
             * Position the 'loading' display vertically either at the center
             * of the viewport, or at the top of the viewport.
             */
            var top;
            if (center_vertically) {
                var viewport = $(window).height();
                var doc_offset = $(document).scrollTop();
                top = (viewport / 2 + doc_offset) - (loading.height() / 2);
            } else {
                top = $(document).scrollTop();
            }
            var zIndex = z_index;
            if ('undefined' === typeof zIndex) {
                zIndex = 1000;
            }
            loading.appendTo('body');
            loading.css({
                display: 'block',
                position: 'absolute',
                top: top,
                left: left,
                zIndex: zIndex
            });

            // Fix ie 6 bug
            if ('undefined' !== typeof $.bgiframe) {
                loading.bgiframe();
            }
            loading.animate(
                {
                    opacity: 1
                },
                {
                    duration: animation_length_ms,
                    easing: 'linear'
                }
            );
            container.animate(
                {
                    opacity: container_opacity
                },
                {
                    duration: animation_length_ms,
                    easing: 'linear'
                }
            );
        }
    };
    t11e.event.subscribe('searching.' + search_group, show_loading);

    /*
     * Hides the loading popup.
     */
    var hide_loading = function () {
        if (t11e.util.is_defined(loading) && loading.length !== 0 &&
            t11e.util.is_defined(container) && container.length !== 0) {
            loading.animate(
                {
                    opacity: 0
                },
                {
                    duration: animation_length_ms,
                    easing: 'linear',
                    complete: function () {
                        loading.css(
                            {
                                display: 'none'
                            }
                        );
                    }
                }
            );
            container.animate(
                {
                    opacity: 1
                },
                {
                    duration: animation_length_ms,
                    easing: 'linear'
                }
            );
        }
    };

    var highlight_text = function (target, discoveryResponse) {
        if (t11e.util.is_array(options.highlight_filter)) {
            var explanation = t11e.util.deref(discoveryResponse, 'explanation');
            if (t11e.util.is_defined(explanation)) {
                var tokens = [];
                $(explanation).each(function (i, explain) {
                    var currentTokens = explain.textTokens;
                    if (t11e.util.is_defined(currentTokens)) {
                        tokens = tokens.concat(tokens, currentTokens);
                    }
                });
                if (tokens.length > 0) {
                    var sections = [];
                    $(options.highlight_filter).each(function (i, filter) {
                        $.merge(sections, target.find(filter));
                    });
                    $(sections).each(function (i, section) {
                        t11e.widget.jquery.text_highlighter($, section, highlight_template,
                            t11e.widget.jquery.text_token_filter_factory($, tokens));
                    });
                }
            }
        }
    };
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_results', t11e.widget.jquery.ResultsWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_pagination definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Widget that displays pagination controls for the search results.
 *
 * <h2>Options</h2>
 * <dl>
 *     <dt>css_class</dt>
 *     <dd>An optional CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *     <dt>search_group</dt>
 *     <dd>The search group for whom the pagination widget displays pagination results.</dd>
 *
 *     <dt>page_param</dt>
 *     <dd>The search parameter that represents the current page number. Search
 *     widgets reset the <code>page_param</code> parameter when a search is updated
 *     so that the new search results will start on the first page.</dd>
 *
 *     <dt>page_size</dt>
 *     <dd>The number of result items per page.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-pagination">
 *    <div class="t11e-hd t11e-widget-jquery-pagination-hd"></div>
 *    <div class="t11e-bd t11e-widget-jquery-pagination-bd">
 *      <div class="pagination"/>
 *    </div>
 *    <div class="t11e-ft t11e-widget-jquery-pagination-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_pagination({
 *       "search_group": "default",
 *       "page_param": "page"
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.PaginationWidget.
 *
 * @name jQuery.ui.t11e_pagination
 * @class Displays pagination navigation links for search results.
 */
t11e.widget.jquery.PaginationWidget = function ($, options) {
    var search_group = options.search_group;
    var page_param = options.page_param;
    var pagination = $(this).find(".pagination:first");

    var change_page = function (page_id, panel) {
        t11e.event.trigger('update_request.' + search_group, function (params) {
            params[page_param] = [page_id + 1];
        });
        return false;
    };
    var update_from_response = function (search) {
        var page_size = t11e.util.deref(search, '_discovery.response.pageSize');
        var page_id = t11e.util.deref(search, '_discovery.response.startIndex') / page_size;
        var result_count = t11e.util.deref(search, '_discovery.response.totalSize');
        pagination.pagination(result_count, {
            current_page: page_id,
            items_per_page: page_size,
            callback: change_page
        });
    };
    t11e.event.subscribe('response.' + search_group, update_from_response);

    var clear_params_from_search = function (params) {
        t11e.util.remove_param(params, page_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_pagination', t11e.widget.jquery.PaginationWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_select definition
 *
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * A search enabled select widget.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>css_class</dt>
 *    <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group</dd>
 *
 *    <dt>value_param</dt>
 *    <dd>The search group parameter this widget listens to.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-select">
 *     <div class="t11e-hd t11e-widget-jquery-select-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-select-bd">
 *       <form name="">
 *         <select name="s">
 *           <option value="">--Select One--</option>
 *           <option value="apple">Apple</option>
 *           <option value="orange">Orange</option>
 *           <option value="banana">Banana</option>
 *         </select>
 *       </form>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-select-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_select({
 *       "search_group": "default",
 *       "value_param": "s"
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.SelectWidget.
 *
 * @name jQuery.ui.t11e_select
 * @class A search enabled select widget.
 *
 * */
t11e.widget.jquery.SelectWidget = function ($, options) {
    var search_group = options.search_group;
    var value_param = options.value_param;
    var dimension = options.dimension;
    var select = $(this).find('form select');
    var select_options = $(this).find('form select option');

    var ignore_event = false;
    /*
     * Update the widget's current state from the params object. This
     * function is used as a callback to the <code>request</code> topic.
     * @param {Object} params
     */
    var load_from_params = function (/*Object*/params) {
        var values = params[value_param];
        if (t11e.util.is_undefined(values)) {
            values = [];
        }
        ignore_event = true;
        try {
            select_options.each(function (i, option) {
                var selected = (-1 !== $.inArray(option.value, values));
                if (option.selected !== selected) {
                    option.selected = selected;
                }
            });
        } finally {
            var selected_options = select.find('option:selected');
            // Select first option (for safari so behavior matches ff)
            if (selected_options.length === 0) {
                var def_option = select.find('option:first');
                def_option.attr('selected', 'selected');
            }
            ignore_event = false;
        }
    };
    /*
    * Subscribe to the request topic.
    */
    t11e.event.subscribe('request.' + search_group, load_from_params);
    /*
     * @function
     * @description Adds a facet to the search request parameters
     * @param {Object} params
     * @param {String} facet_id
     * @returns {Boolean}
     *     Returns <code>true</code> if the search params have changed.
     */
    var add_facet_to_params = function (params, facet_id) {
        var changed = false;
        if (t11e.util.is_defined(facet_id) &&
            '' !== facet_id) {
            var values = params[value_param];
            if (t11e.util.is_undefined(values)) {
                params[value_param] = [facet_id];
                changed = true;
            }
            else if (-1 === $.inArray(facet_id, values)) {
                values.push(facet_id);
                changed = true;
            }
        }
        return changed;
    };
    /*
     * @function
     * @description Removes a facet from the search request parameters
     * @param {Object} params
     * @param {String} facet_id
     * @returns {Boolean}
     *     Returns <code>true</code> if a facet was removed from the
     *     search params.
     */
    var remove_facet_from_params = function (params, facet_id) {
        var changed = false;
        var values = params[value_param];
        if (t11e.util.is_defined(values)) {
            var old_length = values.length;
            params[value_param] = $.grep(values, function (v, i) {
                return v !== facet_id;
            });
            changed = old_length !== params[value_param].length;
        }
        return changed;
    };
    /*
     * Update the search request parameters.
     *
     * @param {Object} event
     */
    var option_changed = function (event) {
        if (!ignore_event) {
            var changed = false;
            t11e.event.trigger('update_request.' + search_group, function (params) {
                select_options.each(function (i, option) {
                    if (option.selected) {
                        changed = add_facet_to_params(params, option.value) || changed;
                    } else {
                        changed = remove_facet_from_params(params, option.value) || changed;
                    }
                });
                if (changed) {
                    t11e.util.remove_param(params, options.page_param);
                }
            });
        }
    };

    $(select).bind('change', option_changed);

    /*
     * Clear all the widget's options. This
     * function is used as a callback to the <code>clear_params_from_search</code> topic.
     * @param {Object} params
     */
    var clear_params_from_search = function (params) {
        t11e.widget.jquery.util.remove_checkbox_values_from_params($, select_options, params, value_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_select', t11e.widget.jquery.SelectWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_faceted_checkboxes definition
 *
 * <p>{@link t11e.widget.jquery.FacetedCheckboxesWidget} provides a faceted
 * search interface of either checkboxes or radio buttons.</p>
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * <p>Widget that displays faceted checkboxes which allow selection of
 * facets to alter the search and display the facet counts from the
 * response.</p>
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>css_class</dt>
 *    <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group</dd>
 *
 *    <dt>value_param</dt>
 *    <dd>The search group parameter this widget listens to.</dd>
 *
 *    <dt>dimension</dt>
 *    <dd>The dimension (index) used for updating drilldown counts.</dd>
 * </dl>
 *
 * <h2>Example - Exact counts</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example-exact" class="t11e-widget t11e-widget-jquery-faceted-checkboxes">
 *    <div class="t11e-hd t11e-widget-jquery-faceted-checkboxes-hd"></div>
 *    <div class="t11e-bd t11e-widget-jquery-faceted-checkboxes-bd">
 *      <form action="">
 *        <div class="row">
 *          <input type="checkbox" name="shape" value="square">
 *          <label>Square</label><span class="facet-count">0</span>
 *        </div>
 *        <div class="row">
 *          <input type="checkbox" name="shape" value="circle">
 *          <label>Circle</label><span class="facet-count">0</span>
 *        </div>
 *        <div class="row">
 *          <input type="checkbox" name="shape" value="triangle">
 *          <label>Triangle</label><span class="facet-count">0</span>
 *        </div>
 *      </form>
 *    </div>
 *    <div class="t11e-ft t11e-widget-jquery-faceted-checkboxes-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example-exact").t11e_faceted_checkboxes({
 *       "search_group": "default",
 *       "value_param": "shape",
 *       "dimension": "shape"
 *     });
 *   </script>
 * --></div>
 *
 * <h2>Example - Fuzzy counts</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example-fuzzy" class="t11e-widget t11e-widget-jquery-faceted-checkboxes">
 *    <div class="t11e-hd t11e-widget-jquery-faceted-checkboxes-hd"></div>
 *    <div class="t11e-bd t11e-widget-jquery-faceted-checkboxes-bd">
 *      <form action="">
 *        <div class="row">
 *          <input type="checkbox" name="shape" value="square">
 *          <label>Square</label><span class="fuzzy-facet-count">0</span>
 *        </div>
 *        <div class="row">
 *          <input type="checkbox" name="shape" value="circle">
 *          <label>Circle</label><span class="fuzzy-facet-count">0</span>
 *        </div>
 *        <div class="row">
 *          <input type="checkbox" name="shape" value="triangle">
 *          <label>Triangle</label><span class="fuzzy-facet-count">0</span>
 *        </div>
 *      </form>
 *    </div>
 *    <div class="t11e-ft t11e-widget-jquery-faceted-checkboxes-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example-fuzzy").t11e_faceted_checkboxes({
 *       "search_group": "default",
 *       "value_param": "shape",
 *       "dimension": "shape"
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.FacetedCheckboxesWidget.
 *
 * @name jQuery.ui.t11e_faceted_checkboxes
 * @class A checkbox widget that displays facet counts.
 *
 * */
t11e.widget.jquery.FacetedCheckboxesWidget = function ($, options) {
    var search_group = options.search_group;
    var value_param = options.value_param;
    var dimension = options.dimension;
    var settings = options.settings;
    var checkboxes = $(this).find('form div.row input');

    var ignore_event = false;
    /* @scope t11e.widget.jquery.FacetedCheckboxesWidget */
    /*
     * Update the widget's current state from the params object. This
     * function is used as a callback to the <code>request</code> topic.
     * @param {Object} params
     */
    var load_from_params = function (/**Object*/params) {
        var values = params[value_param];
        if (t11e.util.is_undefined(values)) {
            values = [];
        }
        ignore_event = true;
        try {
            checkboxes.each(function (i, checkbox) {
                var selected = (-1 !== $.inArray(checkbox.value, values));
                if (checkbox.checked !== selected) {
                    checkbox.checked = selected;
                }
            });
        } finally {
            ignore_event = false;
        }
    };
    /*
    * Subscribe to the request topic.
    */
    t11e.event.subscribe('request.' + search_group, load_from_params);
    /*
     * @function
     * @description Adds a facet to the search request parameters
     * @param {Object} params
     * @param {String} facet_id
     * @returns {Boolean}
     *     Returns <code>true</code> if the search params have changed.
     */
    var add_facet_to_params = function (params, facet_id) {
        var changed = false;
        var values = params[value_param];
        if (t11e.util.is_undefined(values)) {
            params[value_param] = [facet_id];
            changed = true;
        } else if (-1 === $.inArray(facet_id, values)) {
            values.push(facet_id);
            changed = true;
        }
        return changed;
    };
    /*
     * @function
     * @description Removes a facet from the search request parameters
     * @param {Object} params
     * @param {String} facet_id
     * @returns {Boolean}
     *     Returns <code>true</code> if a facet was removed from the
     *     search params.
     */
    var remove_facet_from_params = function (params, facet_id) {
        var changed = false;
        var values = params[value_param];
        if (t11e.util.is_defined(values)) {
            var old_length = values.length;
            params[value_param] = $.grep(values, function (v, i) {
                return v !== facet_id;
            });
            changed = old_length !== params[value_param].length;
        }
        return changed;
    };
    /*
     * Update the search request parameters and the breadcrumbs when
     * a checkbox or radio button is clicked.
     *
     * <h2>Triggers:</h2>
     * <ul>
     * <li>update_request</li>
     * </ul>
     *
     * @param {Object} event
     */
    var checkbox_clicked = function (event) {
        if (!ignore_event) {
            var changed = false;
            t11e.event.trigger('update_request.' + search_group, function (params) {
                checkboxes.each(function (i, checkbox) {
                    if (checkbox.checked) {
                        changed = add_facet_to_params(params, checkbox.value) || changed;
                    } else {
                        changed = remove_facet_from_params(params, checkbox.value) || changed;
                    }
                });
                if (changed) {
                    t11e.util.remove_param(params, options.page_param);
                }
            });
        }
    };

    checkboxes.each(function (i, checkbox) {
        $(checkbox).bind('click', checkbox_clicked);
    });

    if (t11e.util.is_defined(dimension)) {
        /*
        * @function
        * @description
        *     Update the widget's drilldown counts from the search response object.
        *     This function is used as a callback to the <code>response</code> topic.
        * @param {Object} search The search response object.
        */
        var update_from_response = function (search) {
            var facet_counts =
                t11e.widget.jquery.util.get_dimension_drilldown($, search, dimension);
            var fuzzy_facet_counts =
                t11e.widget.jquery.util.get_dimension_drilldown($, search, dimension, true);

            checkboxes.each(function (i, checkbox) {
                var count = facet_counts[checkbox.value];
                if (t11e.util.is_undefined(count)) {
                    count = 0;
                }
                var fuzzy_count = fuzzy_facet_counts[checkbox.value];
                if (t11e.util.is_undefined(fuzzy_count)) {
                    fuzzy_count = 0;
                }
                $(checkbox).find('~span.facet-count').each(function (i, span) {
                    $(span).html(count);
                });
                $(checkbox).find('~span.fuzzy-facet-count').each(function (i, span) {
                    $(span).html(fuzzy_count);
                });
            });
        };
        /*
         * Subscribe to the response topic.
         * @param {String} response.search_group
         * @param {Function} callback
         */
        t11e.event.subscribe('response.' + search_group, update_from_response);
    }

    $(this).find('form div.row').each(function (i, row) {
        t11e.widget.jquery.util.associate_labels($, row);
    });

    /* @scope t11e.widget.jquery.FacetedCheckboxesWidget */
    /*
     * Clear all the widget's checkboxes. This
     * function is used as a callback to the <code>clear_params_from_search</code> topic.
     * @param {Object} params
     */
    var clear_params_from_search = function (params) {
        t11e.widget.jquery.util.remove_checkbox_values_from_params($, checkboxes, params, value_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
};


t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_faceted_checkboxes', t11e.widget.jquery.FacetedCheckboxesWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_faceted_flyout definition
 * <p>
 * Provides a faceted search interface of either checkboxes or radio buttons
 * that includes a flyout panel to display additional choices.
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * A widget with the same functionality as {@link jQuery.ui.t11e_faceted_checkboxes_widget}
 * that also contains a flyout panel.
 *
 * <h2>Options</h2>
 *<dl>
 *    <dt>css_class</dt>
 *    <dd>An optional CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group.</dd>
 *
 *    <dt>value_param</dt>
 *    <dd>The search group parameter this widget listens to.</dd>
 *
 *    <dt>dimension</dt>
 *    <dd>The dimension (index) used for updating drilldown counts.</dd>
 *
 *    <dt>primary_settings</dt>
 *    <dd>The primary list of items that are always displayed.</dd>
 *
 *    <dt>secondary_settings</dt>
 *    <dd>The secondary list of items that are displayed in the flyout panel</dd>
 *
 *    <dt>flyout_panel_width</dt>
 *    <dd>The width, in pixels, of the flyout panel</dd>
 *
 *    <dt>column_count</dt>
 *    <dd>The number of columns to be used in the flyout panel</dd>
 *</dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-faceted-flyout">
 *     <div class="t11e-hd t11e-widget-jquery-faceted-flyout-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-faceted-flyout-bd">
 *       <div class="breadcrumb"></div>
 *         <form action="">
 *           <fieldset class="t11e-widget-jquery-faceted-flyout-primary">
 *             <div class="row">
 *               <input type="checkbox" name="c" value="cars">
 *               <label>Cars</label><span class="facet-count">0</span>
 *             </div>
 *             <div class="row">
 *               <input type="checkbox" name="c" value="motorcycles">
 *               <label>Motorcycles</label><span class="facet-count">0</span>
 *             </div>
 *           </fieldset>
 *           <fieldset class="t11e-widget-jquery-faceted-flyout-secondary">
 *             <div class="flyout-panel">
 *               <div class="close-flyout-panel">[x]</div>
 *               <div class="row">
 *                 <input type="checkbox" name="c" value="suvs">
 *                 <label>SUV</label><span class="facet-count">0</span>
 *               </div>
 *               <div class="row">
 *                 <input type="checkbox" name="c" value="trucks">
 *                 <label>Trucks</label><span class="facet-count">0</span>
 *               </div>
 *               <div class="row">
 *                 <input type="checkbox" name="c" value="vans">
 *                 <label>Vans</label><span class="facet-count">0</span>
 *               </div>
 *             </div>
 *           </fieldset>
 *           <div class="toggle-flyout">More...</div>
 *         </form>
 *       </div>
 *     <div class="t11e-ft t11e-widget-jquery-faceted-flyout-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_faceted_flyout({
 *       "search_group": "default",
 *       "value_param": "c",
 *       "dimension": "category",
 *       "column_count": 2,
 *       "flyout_panel_width": 250
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.FacetedFlyoutWidget.
 *
 * @name jQuery.ui.t11e_faceted_flyout
 * @class A checkbox widget that contains a flyout panel for additional options.
 *
 */
t11e.widget.jquery.FacetedFlyoutWidget = function ($, options) {
    /*
     * Widget that displays faceted checkboxes which allow selection of
     * facets to alter the search and display the facet counts from the
     * response.
     */
    var search_group = options.search_group;
    var value_param = options.value_param;
    var dimension = options.dimension;
    var checkboxes = $(this).find('form div.row input');

    var toggle_flyout_button = $(this).find('div.toggle-flyout:first');
    var container = $(this).find('div.t11e-widget-jquery-faceted-flyout-bd > form:first');
    var breadcrumb = $(this).find('.breadcrumb:first');
    var primary = $(this).find('.t11e-widget-jquery-faceted-flyout-primary:first');
    var secondary = $(this).find('.t11e-widget-jquery-faceted-flyout-secondary:first');
    var flyout_panel = secondary.find('div:first');
    var close_flyout_panel = flyout_panel.find('div.close-flyout-panel');
    var primary_values = $.map(primary.find('div.row input'), function (n) {
        return $(n).attr('value');
    });

    // Fix ie 6 bug
    if (t11e.util.is_defined($.bgiframe)) {
        flyout_panel.bgiframe();
    }

    var ignore_event = false;
    /* @scope t11e.widget.jquery.FacetedFlyoutWidget */
    /*
     * Update the widget's current state from the params object. This
     * function is used as a callback to the <code>request</code> topic.
     * @param {Object} params
     */
    var load_from_params = function (params) {
        var values = params[value_param];
        if (t11e.util.is_undefined(values)) {
            values = [];
        }
        ignore_event = true;
        try {
            checkboxes.each(function (i, checkbox) {
                var selected = (-1 !== $.inArray(checkbox.value, values));
                if (checkbox.checked !== selected) {
                    checkbox.checked = selected;
                }

                if (-1 === $.inArray(checkbox.value, primary_values)) {
                    if (checkbox.checked === true) {
                        add_breadcrumb(checkbox);
                    } else {
                        remove_breadcrumb(checkbox);
                    }
                }
            });
        } finally {
            ignore_event = false;
        }
    };
    t11e.event.subscribe('request.' + search_group, load_from_params);

    /* @scope t11e.widget.jquery.FacetedFlyoutWidget */
    /*
     * Clear all the widget's checkboxes. This
     * function is used as a callback to the <code>clear_params_from_search</code> topic.
     * @param {Object} params
     */
    var clear_params_from_search = function (params) {
        t11e.widget.jquery.util.remove_checkbox_values_from_params($, checkboxes, params, value_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);

    /*
     * @function
     * @description Adds a facet to the search request parameters
     * @param {Object} params
     * @param {String} facet_id
     * @returns {Boolean}
     *     Returns <code>true</code> if a facet was removed from the
     *     search params.
     */
    var add_facet_to_params = function (params, facet_id) {
        var values = params[value_param];
        if (t11e.util.is_undefined(values)) {
            params[value_param] = [facet_id];
        } else if (-1 === $.inArray(facet_id, values)) {
            values.push(facet_id);
        }
    };
    /*
     * Update the search request parameters and the breadcrumbs when
     * a checkbox or radio button is clicked.
     *
     * @param {Object} event
     */
    var remove_facet_from_params = function (params, facet_id) {
        var values = params[value_param];
        if (t11e.util.is_defined(values)) {
            params[value_param] = $.grep(values, function (v, i) {
                return v !== facet_id;
            });
        }
    };
    /*
     * Update the search request parameters when
     * a checkbox or radio button is clicked.
     *
     * <h2>Triggers:</h2>
     * <ul>
     * <li>update_request</li>
     * </ul>
     *
     * @param {Object} event
     */
    var checkbox_clicked = function (event) {
        var input = this;
        if (!ignore_event) {
            t11e.event.trigger('update_request.' + search_group, function (params) {
                if (input.checked) {
                    add_facet_to_params(params, input.value);
                } else {
                    remove_facet_from_params(params, input.value);
                }
                t11e.util.remove_param(params, options.page_param);
            });
        }
    };
    checkboxes.each(function (i, checkbox) {
        $(checkbox).bind('click', checkbox_clicked);
    });

    if (t11e.util.is_defined(dimension)) {
        /*
        * @function
        * @description
        *     Update the widget's drilldown counts from the search response object.
        *     This function is used as a callback to the <code>response</code> topic.
        * @param {Object} search The search response object.
        */
        var update_from_response = function (search) {
            var facet_counts =
                t11e.widget.jquery.util.get_dimension_drilldown($, search, dimension);

            checkboxes.each(function (i, checkbox) {
                // Updated drillDown counts
                var count = facet_counts[checkbox.value];
                if (t11e.util.is_undefined(count)) {
                    count = 0;
                }
                $(checkbox).find('~span.facet-count').each(function (i, span) {
                    $(span).html(count);
                });
            });
        };
        t11e.event.subscribe('response.' + search_group, update_from_response);
    }

    $(this).find('form div.row').each(function (i, row) {
        t11e.widget.jquery.util.associate_labels($, row);
    });

    var init = function () {
        // Initialize the flyout panel
        var flyout_left = breadcrumb.offset().left;
        var flyout_top = breadcrumb.offset().top;
        if (t11e.util.is_defined(secondary)) {
            secondary.appendTo('body');
            secondary.css({
                position: 'absolute',
                top: flyout_top,
                left: flyout_left
            });
            if ('undefined' !== options.column_width) {
                secondary.find('div.row').each(function (i) {
                    $(this).css({
                        width: options.column_width
                    });
                });
            }

            if (t11e.util.is_defined(flyout_panel) && t11e.util.is_defined(options.flyout_panel_width)) {
                flyout_panel.css({
                    width: options.flyout_panel_width
                });
            }

            layout_flyout_panel_into_columns();
        }

        if (t11e.util.is_defined(close_flyout_panel)) {
            close_flyout_panel.bind('click', function (event) {
                hide_flyout();
            });
        }
    };

    var layout_flyout_panel_into_columns = function () {
        var num_secondary = secondary.find('div.row input').size();
        if (num_secondary > 1 && Number(options.column_count) > 1) {
            var num_per_column = Math.ceil(num_secondary / options.column_count);
            var table = $('<table><tbody><tr></tr></tbody></table>');
            var tr = table.find('tr:first');
            var tds = [];
            tds.length = options.column_count;
            $.each(tds, function (i, td) {
                tds[i] = $('<td></td>');
                tds[i].appendTo(tr);
            });

            flyout_panel.find('div.row').each(function (i) {
                var current_column = Math.min(Math.floor(i / num_per_column), tds.length - 1);
                $(this).appendTo(tds[current_column]);
            });
            table.appendTo(flyout_panel);
        }
    };

    var add_breadcrumb = function (checkbox) {
        var crumb = breadcrumb.find('span[facet_id=' + checkbox.value + ']');
        if (crumb.size() === 0) {
            var crumb_label = $(checkbox).parent().find('label').html();
            crumb = $('<span class="' + crumb_label + '" facet_id="' +
                checkbox.value + '">' + crumb_label +
                ' [<a href="#" class="close">x</a>] </span> ').appendTo(breadcrumb);
            var crumb_anchor = crumb.find('a:first');
            crumb_anchor.bind('click', function () {
                var facet_id = $(this).parent().attr('facet_id');
                t11e.event.trigger('update_request.' + search_group, function (params) {
                    remove_facet_from_params(params, facet_id);
                    t11e.util.remove_param(params, options.page_param);
                });
                t11e.event.trigger('perform_search');
                return false;
            });
        }
    };

    var remove_breadcrumb = function (checkbox) {
        breadcrumb.find('span[facet_id=' + checkbox.value + ']').remove();
    };

    var flyout_panel_is_empty = function () {
        return (flyout_panel.children().size() === 0);
    };

    var show_flyout = function () {
        secondary.show('slow');
        toggle_flyout_button.html('Hide...');
    };

    var hide_flyout = function () {
        secondary.hide('slow');
        toggle_flyout_button.html('More...');
    };

    var update_toggle_flyout_button_state = function () {
        if (flyout_panel_is_empty() === true) {
            toggle_flyout_button.addClass('t11e-state-disabled');
            hide_flyout();
        } else {
            toggle_flyout_button.removeClass('t11e-state-disabled');
        }
    };

    toggle_flyout_button.bind('click', function (event) {
        if (toggle_flyout_button.hasClass('t11e-state-disabled') !== true) {
            if (toggle_flyout_button.html() === 'Hide...') {
                hide_flyout();
            } else {
                show_flyout();
            }
            update_toggle_flyout_button_state();
        }
    });

    init();
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_faceted_flyout', t11e.widget.jquery.FacetedFlyoutWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_textbox definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Widget that displays a text entry box.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>search_group</dt>
 *    <dd>The search group this widget is associated with.</dd>
 *
 *    <dt>value_param</dt>
 *    <dd>The query parameter this widget is associated with.</dd>
 * </dl>
 *
 * Also available as t11e.widget.jquery.TextBoxWidget.
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <input id="example" name="k">
 *   <script type="text/javascript">
 *     $("#example").t11e_textbox({
 *       "search_group": "default",
 *       "value_param": "k"
 *     });
 *   </script>
 * --></div>
 *
 * <h2>Deprecated Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example2" class="t11e-widget t11e-widget-jquery-textbox">
 *     <div class="t11e-hd t11e-widget-jquery-textbox-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-textbox-bd">
 *       <form action="" onsubmit="return false;">
 *         <input name="k">
 *       </form>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-textbox-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example2").t11e_textbox({
 *       "search_group": "default",
 *       "value_param": "k"
 *     });
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_textbox
 * @class A textbox widget for keyword searches.
 */
t11e.widget.jquery.TextBoxWidget = function ($, options) {
    var search_group = options.search_group;
    var value_param = options.value_param;
    var textbox = $(this).is(':input') ? $(this) : $(this).find('input:first');

    var ignore_event = false;
    var load_from_params = function (params) {
        var values = params[value_param];
        var value = t11e.util.is_defined(values) ? values[0] : '';
        value = t11e.util.is_defined(value) ? value : '';
        ignore_event = true;
        try {
            textbox.val(value);
        } finally {
            ignore_event = false;
        }
    };
    t11e.event.subscribe('request.' + search_group, load_from_params);

    var save_to_params = function (params) {
        var val = $.trim(textbox.val());
        if ('' !== val) {
            params[value_param] = [val];
        } else {
            delete params[value_param];
        }
        t11e.util.remove_param(params, options.page_param);
    };

    var changed = function (event) {
        if (!ignore_event) {
            t11e.event.trigger('update_request.' + search_group, save_to_params);
        }
    };
    textbox.bind('change', changed);

    t11e.widget.jquery.util.associate_labels($, this);

    var clear_params_from_search = function (params) {
        t11e.util.remove_param(params, value_param);
        t11e.util.remove_param(params, options.page_param);
    };
    t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_textbox', t11e.widget.jquery.TextBoxWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_button definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * <h2>Options</h2>
 * <dl>
 *    <dt>search_group</dt>
 *    <dd>The search group this widget is associated with.</dd>
 *
 *    <dt>event_name</dt>
 *    <dd>The event_name option is a template that is filled in with the rest of
 *       the options.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-button">
 *     <div class="t11e-hd t11e-widget-jquery-button-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-button-bd">
 *       <a href="#">Reset</a>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-button-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_button({
 *       "search_group": "default",
 *       "event_name": "reset_search"
 *     });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.ButtonWidget.
 *
 * @name jQuery.ui.t11e_button
 * @class Implements a button that triggers a configured event.
 */
t11e.widget.jquery.ButtonWidget = function ($, options) {
    var event_name = $.template(options.event_name).apply(options);
    var button = $(this).find('.t11e-widget-jquery-button-bd:first a');

    button.bind('click', function (event) {
        t11e.event.trigger(event_name);
        event.preventDefault();
        event.stopPropagation();
    });
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_button', t11e.widget.jquery.ButtonWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_params definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Display search parameters for individual search group.
 *
 * <h2>Options</h2>
 * <dl>
 *   <dt>search_group</dt>
 *   <dd>The search group from which this widget displays the params.</dd>
 * <dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-params">
 *     <div class="t11e-hd t11e-widget-jquery-params-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-params-bd">
 *       <div class="t11e-params"/>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-params-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_params({
 *       "search_group": "history"
 *     });
 *     // For example purposes only, change the hash to create some
 *     // parameters.
 *     window.location.hash = "&a=example%20param&b=another%20one";
 *   </script>
 * --><div>
 *
 * Also available as t11e.widget.jquery.ParamsWidget.
 *
 * @name jQuery.ui.t11e_params
 * @class Debug widget for displaying the current search parameters by search_group
 */
t11e.widget.jquery.ParamsWidget = function ($, options) {
    var search_group = options.search_group;
    var target = $(this).find(".t11e-params:first");

    var load_from_params = function (params) {
        target.html('<pre style="overflow:scroll;">' + JSON.stringify(params, null, '  ') + '</pre>');
    };
    t11e.event.subscribe('request.' + search_group, load_from_params);

};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_params', t11e.widget.jquery.ParamsWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_google_map defintion
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Widget for displaying geocoded results on a Google map.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>css_class</dt>
 *    <dd>An optional CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group whose results this map widget displays.</dd>
 *
 *    <dt>dimension</dt>
 *    <dd></dd>
 *
 *    <dt>center_latitude, center_longitude</dt>
 *    <dd>The default latitude and longitude values used to center the map when there
 *    are no search results to display.</dd>
 *
 *    <dt>zoom_level</dt>
 *    <dd>The default zoom_level for the map. When there are search results, the map
 *    automatically resizes to include all of the results.</dd>
 *
 *    <dt>close_match_icon</dt>
 *    <dd>Template string used to construct a url to the image used in the marker that
 *    represents a close, or 'fuzzy', match.</dd>
 *
 *    <dt>exact_match_icon</dt>
 *    <dd>Template string used to construct a url to the image used in the marker that
 *    represents an exact match.</dd>
 *
 *    <dt>icon_height, icon_width</dt>
 *    <dd>Pixel height and width of the map icon image.</dd>
 *
 *    <dt>icon_anchor_x, icon_anchor_y</dt>
 *    <dd>The pixel coordinates used to position map icons, relative to the top left
 *    corner of the icon image where the icon will be anchored to the map</dd>
 *
 *    <dt>icon_shadow</dt>
 *    <dd>Url for the shadow image icon.</dd>
 *
 *    <dt>icon_shadow_height, icon_shadow_width</dt>
 *    <dd>Pixel height and width of the icon shadow image.</dd>
 *
 *    <dt>item_info_url</dt>
 *    <dd>Template string used to retrieve content for the map's info windows, e.g.:
 *    <pre>
 *        /info_window/${id}/
 *    </pre>
 *    </dd>
 *
 *    <dt>map_height</dt>
 *    <dd>The display height of the map. The default is '300px'.</dd>
 *</dl>
 *
 *<h2>Example</h2>
 * <script src="http://maps.google.com/maps?file=api&amp;v=2.x&amp;key=" type="text/javascript"></script>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-google-map">
 *     <div class="t11e-hd t11e-widget-jquery-google-map-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-google-map-bd">
 *       <div class="google-map"></div>
 *     </div>
 *     <div class="t11e-ft t11e-widget-jquery-google-map-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_google_map({
 *       "search_group": "default",
 *       "center_latitude": 40.777900699999996,
 *       "center_longitude": -73.9634018,
 *       "zoom_level": 13,
 *       "map_height": 250
 *      });
 *   </script>
 * --></div>
 *
 * Also available as t11e.widget.jquery.GoogleMapWidget.
 *
 * @name jQuery.ui.t11e_google_map
 * @class A widget for displaying search results on a Google map.
 */
t11e.widget.jquery.GoogleMapWidget = function ($, options) {
    var search_group = options.search_group;
    var dimension = options.dimension;
    var map_widget = $(this);
    var map_container = $(this).find('.t11e-widget-jquery-google-map-bd:first > div.google-map');
    var item_info_url = options.item_info_url;
    var icon_shadow = options.icon_shadow;
    var exact_match_icon = options.exact_match_icon;
    var close_match_icon = options.close_match_icon;
    var show_criteria_locations = t11e.util.as_boolean(options.show_criteria_locations, false);
    var criteria_icon = options.criteria_icon;
    var previous_map_items;

    var map;

    if (t11e.util.is_defined(options.map_height)) {
        map_container.css({
            height: options.map_height
        });
    }

    map_widget.bind('change', function () {
        if (t11e.util.is_defined(previous_map_items) && null !== previous_map_items) {
            update_map(previous_map_items);
        } else {
            center_map();
        }
    });

    var create_marker = function (map_item) {
        var marker;
        var image_template;
        var image;
        var latlng = new GLatLng(map_item.latitude, map_item.longitude);
        var icon = get_base_icon();
        if (map_item.type === 'criteria') {
            image_template = criteria_icon;
        } else if (map_item.exactMatch === true) {
            image_template = exact_match_icon;
        } else {
            image_template = close_match_icon;
        }
        image = t11e.widget.jquery.util.apply_template($, image_template, map_item);
        if (t11e.util.is_defined(image)) {
            icon.image = image;
            var marker_options = {'icon': icon};
            marker = new GMarker(latlng, marker_options);
        } else {
            marker = new GMarker(latlng);
        }
        marker.map_item = map_item;
        GEvent.addListener(marker, 'click', function (latlng) {
            get_info_window_content(marker);
        });
        return marker;
    };

    var update_from_response = function (search) {
        if (t11e.util.is_defined(search)) {
            var responses = [];
            var criteria_locations = [];
            var map_items = {
                'responses' : responses,
                'criteria_locations': criteria_locations
            };

            (function () {
                var response_ids = t11e.util.deref(search, '_discovery.response.itemIds');
                var response_locations = t11e.util.deref(search, '_discovery.response.values.' + dimension);
                //var response_exact = t11e.util.deref(search, '_discovery.response.exactMatches');
                var start_index = t11e.util.deref(search, '_discovery.response.startIndex');

                if (t11e.util.is_defined(response_ids) &&
                t11e.util.is_defined(response_locations) &&
                //t11e.util.is_defined(response_exact) &&
                t11e.util.is_defined(start_index)) {
                    for (var i = 0; i < response_ids.length; i++) {
                        var location = response_locations[i];
                        if (t11e.util.is_defined(location) && null !== location) {
                            location = location.split(',');

                            var latitude = parseFloat(location[0]);
                            var longitude = parseFloat(location[1]);
                            //var exact = response_exact[i];
                            if (latitude) {
                                var response = {
                                    'id': response_ids[i],
                                    'type': 'result',
                                    'latitude': latitude,
                                    'longitude': longitude,
                                    //'exactMatch': exact,
                                    'index0': i,
                                    'index1': i + 1
                                };
                                responses.push(response);
                            }
                        }
                    }
                }
            }());

            (function () {
                if (show_criteria_locations) {
                    var criteria = t11e.util.deref(search, '_discovery.request.criteria');
                    if (t11e.util.is_defined(criteria)) {
                        for (var i = 0; i < criteria.length; ++i) {
                            if (criteria[i].dimension === dimension) {
                                var lats = t11e.util.deref(criteria[i], 'latitude');
                                var longs = t11e.util.deref(criteria[i], 'longitude');
                                if (t11e.util.is_defined(lats) && t11e.util.is_defined(longs)) {
                                    var minLen = Math.min(lats.length, longs.length);
                                    for (var posIdx = 0; posIdx < minLen; ++posIdx) {
                                        criteria_locations.push({
                                            'id': criteria[i].locationId,
                                            'type': 'criteria',
                                            'latitude': lats[posIdx],
                                            'longitude': longs[posIdx]
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }());
            create_map();
            update_map(map_items);
            previous_map_items = map_items;
        }
    };
    t11e.event.subscribe('response.' + search_group, update_from_response);

    var create_map = function () {
        if (t11e.util.is_defined(window.GBrowserIsCompatible) &&
            window.GBrowserIsCompatible() &&
            t11e.util.is_defined(window.GMap2) &&
            t11e.util.is_undefined(map) &&
            page_load_complete) {
            map = new GMap2(map_container.get(0));
            map.addControl(new GSmallMapControl());
            map.addControl(new GMapTypeControl());
            map.enableContinuousZoom();
        }
    };

    var map_not_ready_items;

    var update_map = function (map_items) {
        if (t11e.util.is_defined(map)) {
            map.clearOverlays();
            map.checkResize();
            var bounds = new GLatLngBounds();
            var markers_exist = false;
            if (t11e.util.is_defined(map_items)) {
                markers_exist = create_markers(map_items.responses, bounds) || markers_exist;
                markers_exist = create_markers(map_items.criteria_locations, bounds) || markers_exist;
            }
            if (markers_exist) {
                map.setCenter(bounds.getCenter(), map.getBoundsZoomLevel(bounds));
            } else {
                center_map();
            }
        } else {
            map_not_ready_items = map_items;
        }
    };

    var create_markers = function (items, bounds) {
        var output = false;
        var i, map_item, marker, latlng;
        if (t11e.util.is_defined(items) && null !== items) {
            for (i = 0; i < items.length; i++) {
                map_item = items[i];
                marker = create_marker(map_item);
                latlng = new GLatLng(map_item.latitude, map_item.longitude);
                bounds.extend(latlng);
                map.addOverlay(marker);
                output = true;
            }
        }
        return output;
    };

    var center_map = function () {
        // Center the map on the default center point
        if (t11e.util.is_defined(map) &&
            t11e.util.is_defined(options.center_latitude) &&
            t11e.util.is_defined(options.center_longitude) &&
            t11e.util.is_defined(options.zoom_level)) {
            var latitude = parseFloat(options.center_latitude);
            var longitude = parseFloat(options.center_longitude);
            var zoom_level = options.zoom_level;
            if (t11e.util.is_defined(latitude) && t11e.util.is_defined(longitude)) {
                map.checkResize();
                var latlng = new GLatLng(latitude, longitude);
                map.setCenter(latlng, zoom_level);
            }
        }
    };

    var get_base_icon = function () {
        var base_icon = new GIcon(G_DEFAULT_ICON);
        if (t11e.util.is_defined(icon_shadow) &&
            '' !== $.trim(icon_shadow)) {
            base_icon.shadow = t11e.widget.jquery.util.apply_template($, icon_shadow, options);
        }
        if (t11e.util.is_defined(options.icon_height) &&
            t11e.util.is_defined(options.icon_width)) {
            base_icon.iconSize = new GSize(options.icon_height, options.icon_width);
        }
        if (t11e.util.is_defined(options.icon_shadow_height) &&
            t11e.util.is_defined(options.icon_shadow_width)) {
            base_icon.shadowSize = new GSize(options.icon_shadow_height, options.icon_shadow_width);
        }
        if (t11e.util.is_defined(options.icon_anchor_x) &&
            t11e.util.is_defined(options.icon_anchor_y)) {
            base_icon.iconAnchor = new GPoint(options.icon_anchor_x, options.icon_anchor_y);
        }
        return base_icon;
    };

    var get_info_window_content = function (marker) {
        if (t11e.util.is_defined(item_info_url) &&
            '' !== $.trim(item_info_url)) {
            var url = t11e.widget.jquery.util.apply_template($, item_info_url, marker.map_item);
            $.ajax({
                url: url,
                dataType: 'html',
                success: function (data, status) {
                    if (t11e.util.is_defined(marker.openInfoWindowHtml)) {
                        marker.openInfoWindowHtml(data);
                    }
                },
                error: function (response, status, error) {
                    // Should an error message be displayed?
                }
            });
        }
    };

    var page_load_complete = false;

    $(document).ready(function () {
        page_load_complete = true;
        create_map();
        center_map();
        update_map(map_not_ready_items);
    });

};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_google_map', t11e.widget.jquery.GoogleMapWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_accordion definition.
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Widget to wrap any widget or html. Adds a window-shade behavior, and keeps
 * the children at top of page when scrolled with shade open behaviors.
 *
 * <h2>Options</h2>
 * <dl>
 *     <dt>css_class</dt>
 *     <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *     <dt>contained_widget_height</dt>
 *     <dd>
 *         Optional CSS height for the inner content of this accordion.
 *         Default is 300px.
 *     </dd>
 *
 *     <dt>animation_length_ms</dt>
 *     <dd>Optional. Milliseconds for window shade open effect. Defaults to 500 ms.</dd>
 * </dl>
 *
 * Also available as t11e.widget.jquery.AccordionWidget.
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-accordion">
 *     <div class="t11e-widget-jquery-accordion-bd">
 *        <div class="t11e-accordion-top"></div>
 *        <ol class="t11e-list-entries t11e-accordion-body">
 *            <li class="t11e-list-entry">
 *                The contained widget goes here.
 *            </li>
 *        </ol>
 *        <div class="t11e-accordion-bottom"></div>
 *     </div>
 *     <div class="t11e-widget-jquery-accordion-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $('#example').t11e_accordion({
 *          "animation_length_ms": 500,
 *          "contained_widget_height": "100px"
 *      });
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_accordion
 * @class Implements window shade behavior.
 *
 */
t11e.widget.jquery.AccordionWidget = function ($, options) {
    var contained_widget_height = options.contained_widget_height || '300px';
    var animation_length_ms = options.animation_length_ms || 500;
    var container = $(this);
    var accordion = $(this).find('.t11e-widget-jquery-accordion-bd:first');
    // Find the first widget contained by the accordion
    var accordion_top = accordion.find('.t11e-accordion-top:first');
    var accordion_body = accordion.find('.t11e-accordion-body:first');
    var accordion_bottom = accordion.find('.t11e-accordion-bottom:first');
    var contained_widget = accordion_body.find('.t11e-widget:first');
    var is_open = false;
    // Capture the height of the accordion so the space will be preserved
    var place_holder_height = accordion.height();
    var original_position = accordion.position().top;
    var original_offset = accordion.offset().top;
    var ie6 = $.browser.msie && $.browser.version.substr(0, 1) < 7;

    accordion_top.bind('click', function (event) {
        toggle_accordion();
    });

    accordion_bottom.bind('click', function (event) {
        toggle_accordion();
    });

    $(window).bind('scroll', function (event) {
        if (is_open) {
            scroll_top = $(window).scrollTop();
            if (!ie6) {
                if (original_offset < scroll_top + 2) {
                    accordion.css({
                        top: 1,
                        position: 'fixed'
                    });
                }
                else {
                    accordion.css({
                        top: original_position,
                        position: 'absolute'
                    });
                }
            }
        }
    });

    var toggle_accordion = function () {
        if (is_open) {
            accordion_body.animate(
                {
                    height: 1
                },
                Number(animation_length_ms),
                'linear',
                function () {
                    accordion_body.css({display: 'none'});
                    accordion.css({
                        position: 'absolute',
                        top: original_position
                    });
                });
        } else {
            accordion_body.css({display: 'block'});
            var scroll_top = $(window).scrollTop();

            if (!ie6 && original_offset < scroll_top + 2) {
                accordion.css({
                    top: 1,
                    position: 'fixed'
                });
            }
            accordion_body.animate(
                {
                    height: contained_widget_height
                },
                {
                    duration: Number(animation_length_ms),
                    easing: 'linear',
                    queue: false
                });
            // Trigger the change event on the contained widget
            // so that it can get updated now that it is visible.
            contained_widget.change();
        }
        is_open = !is_open;
    };

    var init = function () {
        container.height(place_holder_height);
        accordion.css({
            position: 'absolute'
        });
        if (t11e.util.is_defined(accordion.bgiframe)) {
            accordion.bgiframe();
        }
    };
    init();
};

t11e.widget.jquery.make_jquery_ui_widget(jQuery,
    't11e_accordion', t11e.widget.jquery.AccordionWidget);
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview Breadcrumb definition
 */

/**
 * Widget for displaying per search parameter breadcrumbs.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>value_params</dt>
 *    <dd>Array of parameters that breadcrumbs should be displayed for.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-breadcrumb">
 *     <div class="t11e-hd t11e-widget-jquery-breadcrumb-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-breadcrumb-bd"></div>
 *     <div class="t11e-ft t11e-widget-jquery-breadcrumb-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_breadcrumb({
 *       "search_group": "history",
 *       "value_params": ["a", "b", "c"]
 *     });
 *     // For example purposes only, change the hash to create some
 *     // breadcrumbs.
 *     window.location.hash = "&a=example%20breadcrumb&b=another%20one";
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_breadcrumb
 * @class A widget for displaying per search parameter breadcrumbs.
 */
(function ($) {
    var options = {
            search_group: 'default',
            page_param: 'page',
            value_params: [],
            close_template: '&nbsp;[<a class="t11e-close" href="#">x</a>]',
            container: '.t11e-widget-jquery-breadcrumb-bd',
            animate: false,
            animation_speed: 'fast'
        };
    $.widget('ui.t11e_breadcrumb', {options: options});
    $.ui.t11e_breadcrumb.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_breadcrumb.prototype._init = function () {
        var self = this;

        t11e.event.subscribe('request.' + self.options.search_group, function (params) {
            self._load_params(params);
        });

        t11e.event.subscribe('clear_params_from_search.' + self.options.search_group, function (params) {
            self._clear_params(params);
        });
    };

    $.ui.t11e_breadcrumb.prototype._load_params = function (params) {
        var self = this;
        if (t11e.util.is_defined(self.options.value_params)) {
            $.each(self.options.value_params, function (i, param) {
                var crumbs = self._get_breadcrumbs(param);
                values = params[param];
                if (t11e.util.is_undefined(values)) {
                    values = [];
                }
                crumbs.each(function (i, crumb) {
                    var crumb_param = $(crumb).attr('param');
                    var crumb_value = $(crumb).attr('value');
                    var remove = (-1 === $.inArray(crumb_value, values));
                    if (remove) {
                        self.remove_breadcrumb(params, crumb_param, crumb_value);
                    }
                });
                $.each(values, function (i, value) {
                    self.add_breadcrumb(param, value);
                });
            });
        }
    };

    $.ui.t11e_breadcrumb.prototype._clear_params = function (params) {
        var self = this;
        $.each(self.options.value_params, function (i, param) {
            var values = self._get_param_values(param);
            $.each(values, function (i, value) {
                self.remove_breadcrumb(params, param, value);
            });
        });
    };

    $.ui.t11e_breadcrumb.prototype._get_breadcrumb = function (param, value) {
        return this.element.find('div[param=' + param + '][value=' + value + ']');
    };

    $.ui.t11e_breadcrumb.prototype._get_breadcrumbs = function (param) {
        return this.element.find('div[param=' + param + ']');
    };

    $.ui.t11e_breadcrumb.prototype._get_param_values = function (param) {
        var crumbs = this.element.find('div[param=' + param + ']');
        var results =  $.map(crumbs, function (item, i) {
            return $(item).attr('value');
        });
        return results;
    };

    $.ui.t11e_breadcrumb.prototype.add_breadcrumb = function (param, value) {
        var self = this;
        var breadcrumb = self.element.find(self.options.container);
        var crumb = self._get_breadcrumb(param, value);
        if (crumb.size() === 0) {
            crumb = $('<div class="t11e-breadcrumb ui-state-default ui-corner-all" param="' +
                param + '" value="' + value + '">' + value + self.options.close_template + '</div> ');
            crumb.hover(
                function () {
                    $(this).addClass("ui-state-hover");
                },
                function () {
                    $(this).removeClass("ui-state-hover");
                }
            );
            if (self.options.animate) {
                crumb.hide().appendTo(breadcrumb).fadeIn(self.options.animation_speed);
            } else {
                crumb.appendTo(breadcrumb);
            }

            var crumb_anchor = crumb.find('a:first');
            crumb_anchor.bind('click', function () {
                var crumb_param = crumb.attr('param');
                var crumb_value = crumb.attr('value');
                t11e.event.trigger('update_request.' + self.options.search_group, function (params) {
                    self.remove_breadcrumb(params, crumb_param, crumb_value);
                    t11e.util.remove_param(params, self.options.page_param);
                });
                return false;
            });
        }
    };

    $.ui.t11e_breadcrumb.prototype.remove_breadcrumb = function (params, param, value) {
        var self = this;
        var crumb = self._get_breadcrumb(param, value);
        if (self.options.animate) {
            crumb.fadeOut(self.options.animation_speed, function () {
                $(self).remove();
            });
        } else {
            crumb.remove();
        }
        t11e.util.remove_param_value(params, param, value);
    };
}(jQuery));
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_location definition
 */

/**
 * Search widget for geocoding addresses. Wraps t11e_geocode and hooks it into
 * the search event flow. This means that the actual latitude/longitude of
 * the geocoded address can be passed to the search controller.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>search_group</dt>
 *    <dd>The search group associated with this widget.</dd>
 *
 *    <dt>page_param</dt>
 *    <dd>Query parameter for the pagination widget associated with this search.</dd>
 *
 *    <dt>value_param</dt>
 *    <dd>Query parameter for the address.</dd>
 *
 *    <dt>latitude_param</dt>
 *    <dd>Query parameter for latitude.</dd>
 *
 *    <dt>longitude_param</dt>
 *    <dd>Query parameter for longitude.</dd>
 *
 *    <dt>input_selector</dt>
 *    <dd>jQuery selector for the input element to use for displaying and entering the address.</dd>
 *
 *    <dt>display_results</dt>
 *    <dd>If true, the latitude and longitude returned by Google is displayed.</dd>
 *
 *    <dt>results_selector</dt>
 *    <dd>jQuery selector for the input element to use for displaying the latitude and longitude results (most useful for testing).</dd>
 *
 *    <dt>error_selector</dt>
 *    <dd>jQuery selector for the element to use to display the error message.</dd>
 *
 *    <dt>error_template</dt>
 *    <dd>String to display when the entered address cannot be geocoded.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <script src="http://maps.google.com/maps?file=api&amp;v=2.x&amp;key=" type="text/javascript"></script>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-widget-jquery-location">
 *     <div class="t11e-hd t11e-widget-jquery-location-hd"></div>
 *     <div class="t11e-bd t11e-widget-jquery-location-bd"></div>
 *     <div class="t11e-ft t11e-widget-jquery-location-ft"></div>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_location({
 *       "search_group": "default",
 *       "value_param": "location",
 *       "latitude_param": "lat",
 *       "longitude_param": "lon",
 *       "display_results": true
 *     });
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_location
 * @class A search widget that geocodes addresses and makes the geocoded form available for search.
 */

(function ($) {
    var options = {
            search_group: 'default',
            page_param: 'page',
            value_param: 'location',
            latitude_param: 'lat',
            longitude_param: 'lon',
            display_results: 'true',
            display_error: 'true',
            error_selector: '.t11e-widget-jquery-location-ft',
            error_template: 'Unknown address. Please enter a new address.'
        };
    $.widget('ui.t11e_location', {
        // TODO: check compatibility
        widgetEventPrefix: "location",
        options: options
    });
    $.ui.t11e_location.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_location.prototype._init = function () {
        var self = this;
        var options = self.options;
        var container = self.element.find('.t11e-widget-jquery-location-bd:first');
        if (t11e.util.is_defined(container) &&
            container.length > 0) {
            container.t11e_geocode({
                error: function (event, ui) {
                    t11e.event.trigger('update_request.' + options.search_group, function (params) {
                        self._display_error(self.options.error_template);
                        self._clear_params(params);
                    });
                },
                success: function (event, ui) {
                    t11e.event.trigger('update_request.' + options.search_group, function (params) {
                        delete params[options.page_param];
                        self._remove_error();
                        self._save_params(event, ui, params);
                    });
                },
                clear: function (event, ui) {
                    t11e.event.trigger('update_request.' + options.search_group, function (params) {
                        self._remove_error();
                        self._clear_params(params);
                    });
                }
            });
        } else {
            t11e.util.error('Container is not defined');
        }

        t11e.event.subscribe('request.' + options.search_group, function (params) {
            self._load_params(params);
        });

        t11e.event.subscribe('clear_params_from_search.' + options.search_group, function (params) {
            self._clear_params(params);
        });
    };

    $.ui.t11e_location.prototype._load_params = function (params) {
        var self = this;
        var options = this.options;
        var container = self.element.find('.t11e-widget-jquery-location-bd:first');
        if (t11e.util.is_defined(container)) {
            var values = params[options.value_param];
            var value = t11e.util.is_defined(values) ? values[0] : '';
            value = t11e.util.is_defined(value) ? value : '';
            container.t11e_geocode('address', value);
        }
    };

    $.ui.t11e_location.prototype._save_params = function (event, ui, params) {
        var self = this;
        var options = this.options;
        if (t11e.util.is_defined(ui.normalized_address) &&
            t11e.util.is_defined(ui.latitude) &&
            t11e.util.is_defined(ui.longitude)) {
            params[options.value_param] = [ui.normalized_address];
            params[options.latitude_param] = [ui.latitude];
            params[options.longitude_param] = [ui.longitude];
        }
    };

    $.ui.t11e_location.prototype._clear_params = function (params) {
        var self = this;
        var options = this.options;
        delete params[options.value_param];
        delete params[options.latitude_param];
        delete params[options.longitude_param];
        delete params[options.page_param];
    };

    $.ui.t11e_location.prototype._display_error = function (message) {
        var self = this;
        if (self.options.display_error) {
            var error = this.element.find(this.options.error_selector);
            if (t11e.util.is_defined(error)) {
                error.html(message);
            }
        }
    };

    $.ui.t11e_location.prototype._remove_error = function () {
        var error = this.element.find(this.options.error_selector);
        if (t11e.util.is_defined(error)) {
            error.html("");
        }
    };
}(jQuery));
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jquery.ui.t11e_faceted_checkboxes2 definition
 *
 * <p>Provides a faceted search interface of either checkboxes or radio buttons.</p>
 */

/**
 * <p>Widget that displays faceted checkboxes which allow selection of
 * facets to alter the search and display the facet counts from the
 * response.</p>
 *
 * <h2>Options</h2>
 *
 *<dl>
 *    <dt>css_class</dt>
 *    <dd>An option CSS class to be applied to this widget instance to facilitate custom styling.</dd>
 *
 *    <dt>search_group</dt>
 *    <dd>The search group</dd>
 *
 *    <dt>value_param</dt>
 *    <dd>The search group parameter this widget listens to.</dd>
 *
 *    <dt>dimension</dt>
 *    <dd>The dimension (index) used for updating drilldown counts.</dd>

 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example">
 *     <fieldset>
 *       <div class="t11e-input-row">
 *         <input type="checkbox" name="c" value="cars" />
 *         <label>Cars</label><span class="t11e-facet-count">0</span>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input type="checkbox" name="c" value="motorcycles" />
 *         <label>Motorcycles</label><span class="t11e-facet-count">0</span>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input type="checkbox" name="c" value="suvs" />
 *         <label>SUV</label><span class="t11e-facet-count">0</span>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input type="checkbox" name="c" value="trucks" />
 *         <label>Trucks</label><span class="t11e-facet-count">0</span>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input type="checkbox" name="c" value="vans" />
 *         <label>Vans</label><span class="t11e-facet-count">0</span>
 *       </div>
 *     </fieldset>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_faceted_checkboxes2({
 *       "search_group": "default",
 *       "value_param": "c",
 *       "dimension": "category"
 *     });
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_faceted_checkboxes2
 * @class A checkbox widget that displays facet counts.
 */
(function ($) {
    var options = {
        search_group: 'default',
        value_param: '',
        input_selector: 'input',
        row_class: 't11e-input-row',
        facet_count_class: 't11e-facet-count',
        mutex_params: {}
    };
    $.widget('ui.t11e_faceted_checkboxes2', {options: options});
    $.ui.t11e_faceted_checkboxes2.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_faceted_checkboxes2.prototype._init = function () {
        var self = this;

        var search_group = self.options.search_group;
        var value_param = self.options.value_param;
        var dimension = self.options.dimension;
        var settings = self.options.settings;
        var checkboxes = self.element.find(self.options.input_selector);

        self.mutex_param_names = [];
        $.each(self.options.mutex_params, function (value, param_names) {
            $.each(param_names, function (idx, param_name) {
                if (-1 === $.inArray(param_name, self.mutex_param_names)) {
                    self.mutex_param_names.push(param_name);
                }
            });
        });

        var ignore_event = false;
        /*
         * Update the widget's current state from the params object. This
         * function is used as a callback to the <code>request</code> topic.
         * @param {Object} params
         */
        var load_from_params = function (/*Object*/params) {
            var values = params[value_param];
            if (t11e.util.is_undefined(values)) {
                values = [];
            }
            ignore_event = true;
            try {
                checkboxes.each(function (i, checkbox) {
                    var selected = (-1 !== $.inArray(checkbox.value, values));
                    if (checkbox.checked !== selected) {
                        checkbox.checked = selected;
                    }
                    $(checkbox).trigger('update_state');
                });
            } finally {
                ignore_event = false;
            }
        };
        /*
        * Subscribe to the request topic.
        */
        t11e.event.subscribe('request.' + search_group, load_from_params);
        /*
         * @function
         * @description Adds a facet to the search request parameters
         * @param {Object} params
         * @param {String} facet_id
         * @returns {Boolean}
         *     Returns <code>true</code> if the search params have changed.
         */
        var add_facet_to_params = function (params, facet_id) {
            var changed = false;
            var values = params[value_param];
            if (t11e.util.is_undefined(values)) {
                params[value_param] = [facet_id];
                changed = true;
            } else if (-1 === $.inArray(facet_id, values)) {
                values.push(facet_id);
                changed = true;
            }
            return changed;
        };
        /*
         * @function
         * @description Removes a facet from the search request parameters
         * @param {Object} params
         * @param {String} facet_id
         * @returns {Boolean}
         *     Returns <code>true</code> if a facet was removed from the
         *     search params.
         */
        var remove_facet_from_params = function (params, facet_id) {
            var changed = false;
            var values = params[value_param];
            if (t11e.util.is_defined(values)) {
                var old_length = values.length;
                params[value_param] = $.grep(values, function (v, i) {
                    return v !== facet_id;
                });
                changed = old_length !== params[value_param].length;
            }
            return changed;
        };
        /*
         * Update the search request parameters and the breadcrumbs when
         * a checkbox or radio button is clicked.
         *
         * <h2>Triggers:</h2>
         * <ul>
         * <li>update_request</li>
         * </ul>
         *
         * @param {Object} event
         */
        var checkbox_clicked = function (event) {
            if (!ignore_event) {
                var changed = false;
                t11e.event.trigger('update_request.' + search_group, function (params) {
                    checkboxes.each(function (i, checkbox) {
                        if (checkbox.checked) {
                            changed = add_facet_to_params(params, checkbox.value) || changed;
                        } else {
                            changed = remove_facet_from_params(params, checkbox.value) || changed;
                        }
                    });

                    if (changed) {
                        var to_delete = $.merge([], self.mutex_param_names);
                        $.each(params[self.options.value_param] || [], function (idx, value) {
                            var to_keep = self.options.mutex_params[value] || [];
                            to_delete = $.grep(to_delete, function (value, idx) {
                                return -1 === $.inArray(value, to_keep);
                            });
                        });
                        $.each(to_delete, function (idx, val) {
                            delete params[val];
                        });
                        t11e.util.remove_param(params, self.options.page_param);
                    }
                });
            }
        };

        checkboxes.each(function (i, checkbox) {
            $(checkbox).bind('click', checkbox_clicked);
        });

        if (t11e.util.is_defined(dimension)) {
            /*
            * @function
            * @description
            *     Update the widget's drilldown counts from the search response object.
            *     This function is used as a callback to the <code>response</code> topic.
            * @param {Object} search The search response object.
            */
            var update_from_response = function (search) {
                var facet_counts =
                    t11e.widget.jquery.util.get_dimension_drilldown($, search, dimension);

                checkboxes.each(function (i, checkbox) {
                    var count = facet_counts[checkbox.value];
                    if (t11e.util.is_undefined(count)) {
                        count = 0;
                    }
                    // Find sibling elements
                    $(checkbox).find('~.' + self.options.facet_count_class).each(function (i, span) {
                        $(span).html(count);
                    });
                });
            };
            /*
             * Subscribe to the response topic.
             * @param {String} response.search_group
             * @param {Function} callback
             */
            t11e.event.subscribe('response.' + search_group, update_from_response);
        }

        self.element.find('.' + self.options.row_class).each(function (i, row) {
            t11e.widget.jquery.util.associate_labels($, row);
        });

        // Updates checkboxes so that styling can be customized.
        self.element.t11e_styled_checkboxes(self.options);

        /*
         * Clear all the widget's checkboxes. This
         * function is used as a callback to the <code>clear_params_from_search</code> topic.
         * @param {Object} params
         */
        var clear_params_from_search = function (params) {
            t11e.widget.jquery.util.remove_checkbox_values_from_params($, checkboxes, params, value_param);
        };
        t11e.event.subscribe('clear_params_from_search.' + search_group, clear_params_from_search);
    };
}(jQuery));

/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview Geocode widget definition
 */

/**
 * Widget for geocoding addresses.
 *
 * <h2>Options</h2>
 * <dl>
 *    <dt>address</dt>
 *    <dd>The initial address to be geocoded.</dd>
 * </dl>
 *
 * <h2>Example</h2>
 * <script src="http://maps.google.com/maps?file=api&amp;v=2.x&amp;key=" type="text/javascript"></script>
 * <div class="t11e-widget-example"><!--
 *   <div id="example" class="t11e-widget t11e-jquery-ui-geocode"></div>
 *   <script type="text/javascript">
 *     $("#example").t11e_geocode();
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_geocode
 * @class A widget for geocoding addresses.
 */
(function ($) {
    var options = {
        address: ''
    };
    $.widget('ui.t11e_geocode', {
        // TODO: check compatibility
        widgetEventPrefix: 'geocode',
        options: options
    });
    $.ui.t11e_geocode.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_geocode.prototype._init = function () {
        var self = this;
        var options = self.options;
        self.element.addClass('t11e-widget' +
            ' t11e-widget-jquery-geocode');

        self._address = self._inputs('t11e-address', 'text');
        var type = self.options.showResults ? 'text': 'hidden';
        self._latitude = self._inputs('t11e-latitude', type);
        self._longitude = self._inputs('t11e-longitude', type);

        self.geocoding = false;
        if (self._inputs_exist()) {
            var changed = function (event) {
                if (!self.geocoding) {
                    var geocode_address = true;
                    if (self._is_geocoded()) {
                        // Do not re-code if this address has already been geocoded.
                        var address = self.address();
                        var results = self.element.data('results');
                        if (t11e.util.is_defined(results)) {
                            if (address === results.address) {
                                self._address.val(results.normalized_address);
                                self.options.address = results.normalized_address;
                                geocode_address = false;
                            } else if (address === results.normalized_address) {
                                geocode_address = false;
                            }
                        }
                    }
                    if (geocode_address) {
                        self.geocode(event);
                    }
                }
            };
            self._address.bind('change', changed);
        }
        if (options.address) {
            self.address(options.address);
        }
    };

    $.ui.t11e_geocode.prototype._get_geocoder = function (params) {
        var self = this;
        var geocoder;
        if (t11e.util.is_undefined(self._geocoder) &&
            typeof window.GBrowserIsCompatible !== "undefined" &&
            window.GBrowserIsCompatible()) {
            geocoder = new GClientGeocoder();
        }
        return geocoder;
    };

    $.ui.t11e_geocode.prototype._inputs = function (css_class, type) {
        var self = this;
        var input;
        if (t11e.util.is_defined(css_class) &&
            t11e.util.is_defined(type)) {
            input = self.element.find('input.' + css_class + ':first');
            if (!t11e.util.is_defined(input) ||
                input.length === 0) {
                input = $('<input type="' + type + '" value="" />')
                .addClass(css_class)
                .appendTo(self.element);
            }
        }
        return input;
    };

    $.ui.t11e_geocode.prototype._inputs_exist = function () {
        var self = this;
        if (t11e.util.is_defined(self._address) &&
            t11e.util.is_defined(self._latitude) &&
            t11e.util.is_defined(self._longitude)) {
            return true;
        } else {
            return false;
        }
    };

    $.ui.t11e_geocode.prototype._is_geocoded = function () {
        var self = this;
        var results = self.element.data('results');
        if (t11e.util.is_defined(results) &&
            (t11e.util.is_defined(results.address) &&
            '' !== results.address) &&
            (t11e.util.is_defined(results.normalized_address) &&
                '' !== results.normalized_address) &&
            (t11e.util.is_defined(results.latitude) &&
                '' !== results.latitude) &&
            (t11e.util.is_defined(results.longitude) &&
                '' !== results.longitude)) {
            return true;
        } else {
            return false;
        }
    };

    $.ui.t11e_geocode.prototype._clear = function () {
        var self = this;
        self.element.removeData('results');
        if (self._inputs_exist()) {
            self._address.val('');
            self._latitude.val('');
            self._longitude.val('');
        }
    };

    $.ui.t11e_geocode.prototype._update = function (results) {
        var self = this;
        self.element.data('results', results);
        if (self._inputs_exist()) {
            var address = results.normalized_address || '';
            self._address.val(address);
            self.options.address = address;
            var latitude = results.latitude || '';
            self._latitude.val(latitude);
            var longitude = results.longitude || '';
            self._longitude.val(longitude);
        }
    };

    $.ui.t11e_geocode.prototype.address = function (address) {
        var self = this;
        if (t11e.util.is_defined(self._address)) {
            var original_address = $.trim(self._address.val());
            if (arguments.length) {
                if (original_address !== address) {
                    self.options.address = address;
                    self._address.val(address);
                    self._address.change();
                }
            } else {
                return  original_address;
            }
        }
    };

    $.ui.t11e_geocode.prototype.geocode = function (event) {
        var self = this;
        var options = self.options;
        try {
            var geocoder = self._get_geocoder();
            if (t11e.util.is_defined(geocoder) && (self._inputs_exist())) {
                var address = self.address();
                if ('' !== address) {
                    self.geocoding = true;
                    self.element.addClass('t11e-geocoding');
                    geocoder.getLocations(address, function (response) {
                        self.element.removeClass('t11e-geocoding');
                        self.geocoding = false;
                        if (!response || response.Status.code !== 200) {
                            self._clear();
                            self._trigger("error", event, response);
                        } else {
                            place = response.Placemark[0];
                            if (t11e.util.is_defined(place) &&
                                t11e.util.is_defined(place.address) &&
                                t11e.util.is_defined(place.Point.coordinates[1]) &&
                                t11e.util.is_defined(place.Point.coordinates[0])) {
                                var results = {
                                    address: address,
                                    normalized_address: place.address,
                                    latitude: place.Point.coordinates[1],
                                    longitude: place.Point.coordinates[0]
                                };
                                self._update(results);
                                self._trigger("success", event, results);
                            } else {
                                self._clear();
                                self._trigger("error", event, response);
                            }
                        }
                    });
                } else {
                    self._clear();
                    self._trigger("clear", event);
                }
            }
        } catch (ex) {
            t11e.util.error(ex);
        }
    };

    $.ui.t11e_geocode.prototype.destroy = function () {
        this._address.unbind();
        this.element.unbind();
        if (t11e.util.is_defined($.widget)) {
            $.widget.prototype.destroy.apply(this, arguments);
        } else {
            $.Widget.prototype.destroy.apply(this, arguments);
        }
        return this;
    };
}(jQuery));
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview Styled Checkboxes
 * Based on: http://filamentgroup.com/lab/accessible_custom_designed_checkbox_radio_button_inputs_styled_css_jquery/
 */

/**
 * Accessible custom designed checkbox/radio button inputs.
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <div id="example">
 *     <fieldset>
 *       <div class="t11e-input-row">
 *         <input id="cars" type="checkbox" name="c" value="cars" />
 *         <label for="cars">Cars</label>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input id="motorcycles" type="checkbox" name="c" value="motorcycles" />
 *         <label for="motorcycles">Motorcycles</label>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input id="suvs" type="checkbox" name="c" value="suvs" />
 *         <label for="suvs">SUV</label>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input id="trucks" type="checkbox" name="c" value="trucks" />
 *         <label for="trucks">Trucks</label>
 *       </div>
 *       <div class="t11e-input-row">
 *         <input id="vans" type="checkbox" name="c" value="vans" />
 *         <label for="vans">Vans</label>
 *       </div>
 *     </fieldset>
 *   </div>
 *   <script type="text/javascript">
 *     $("#example").t11e_styled_checkboxes();
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_styled_checkboxes
 * @class Accessible custom designed checkbox/radio button inputs
 */
(function ($) {
    var options = {
        input_selector: 'input',
        row_class: 't11e-input-row'
    };
    $.widget('ui.t11e_styled_checkboxes', {options: options});
    $.ui.t11e_styled_checkboxes.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_styled_checkboxes.prototype._init = function () {
        var self = this;
        var inputs = self.element.find(self.options.input_selector);

        inputs.each(function (i, target) {

            if ($(target).is('[type="checkbox"],[type="radio"]')) {
                var input = $(target);
                // get the associated label using the input's id
                var label = self.element.find('label[for="' + input.attr('id') + '"]');

                //get type, for classname suffix
                var input_type = (input.is('[type="checkbox"]')) ? 'checkbox' : 'radio';

                // Deal with legacy faceted checkbox widget code that wraps inputs in divs.
                var parent = input.parent();
                if (parent[0].tagName === 'DIV') {
                    parent.addClass(self.options.row_class + ' t11e-' + input_type);
                } else {
                    // wrap the input + label in a div
                    parent = $('<div/>')
                        .attr('class', self.options.row_class + ' t11e-' + input_type)
                        .insertBefore(input);
                    parent.append(input);
                    parent.append(label);
                }

                // find all inputs in this set using the shared name attribute
                var all_inputs = self.element.find('input[name="' + input.attr('name') + '"]');

                // necessary for browsers that don't support the :hover pseudo class on labels
                label.hover(
                    function () {
                        label.addClass('ui-state-hover');
                        if (input_type === 'checkbox' && input.is(':checked')) {
                            label.addClass('ui-state-checked-hover');
                        }
                    },
                    function () {
                        label.removeClass('ui-state-hover ui-state-checked-hover');
                    }
                );

                // Apply classes to label tags so state can be visually represented
                input.bind('update_state', function () {
                    if (input.is(':checked')) {
                        if (input.is(':radio')) {
                            all_inputs.each(function (i, target) {
                                self.element.find('label[for="' + $(target).attr('id') + '"]')
                                    .removeClass('ui-state-checked');
                            });
                        }
                        label.addClass('ui-state-checked');
                    }
                    else {
                        label.removeClass('ui-state-checked ui-state-checked-hover ui-state-checked-focus');
                    }
                });
                input.trigger('update_state');
                input.bind('click', function () {
                    input.trigger('update_state');
                });
                input.bind('focus', function () {
                    label.addClass('ui-state-focus');
                    if (input_type === 'checkbox' && input.is(':checked')) {
                        label.addClass('ui-state-checked-focus');
                    }
                });
                input.bind('blur', function () {
                    label.removeClass('ui-state-focus ui-state-checked-focus');
                });
            }
        });
    };
}(jQuery));


/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.t11e_local_caching_json_source definition
 */

/**
 * Caching JSON data source, useful to drive a jQuery UI Autocomplete widget.
 * e.g.
 * $(':input').autocomplete({'source': $.t11e_local_caching_json_source('/mysource')});
 */
(function ($) {
    var source_as_fn = function (source, params) {
        var result;
        if ($.isArray(source)) {
            result = undefined;
        } else if (typeof source === "string") {
            result = function (request, response) {
                var actual_request = $.extend({}, params, request);
                $.getJSON(source, actual_request, response);
            };
        } else {
            result = function (request, response) {
                var actual_request = $.extend({}, params, request);
                source(actual_request, response);
            };
        }
        return result;
    };

    $.t11e_local_caching_json_source = function (source, params) {
        var output = source;
        var fn_source = source_as_fn(source, params);
        if (t11e.util.is_defined(fn_source)) {
            var cache = {};
            output = function (request, response) {
                var term = request.term;
                if (term in cache) {
                    var hit = cache[term];
                    if (t11e.util.is_defined(response))
                    {
                        response(hit);
                    }
                } else {
                    fn_source(request, function (result) {
                        cache[term] = result;
                        if (t11e.util.is_defined(response))
                        {
                            response(result);
                        }
                    });
                }
            };
        }
        return output;
    };
}(jQuery));
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview jQuery.ui.t11e_autocomplete definition
 */

/**
 * Autocomplete widget that extends the jQuery UI Autocomplete widget to add
 * client side caching and server side parameter pass through.
 *
 * <h2>Options</h2>
 * <dl>
 *   <dt>source</dt>
 *   <dd>
 *     The source to use, either an Array, URL or function. If this
 *     is not an array then caching is enabled.
 *   </dd>
 *   <dt>source_params</dt>
 *   <dd>
 *     Option dictionary of parameters to pass through to the original source
 *     if the source is not an Array.
 *   </dd>
 * </dl>
 *
 * For other options, see:
 * <a href="http://docs.jquery.com/UI/Autocomplete">http://docs.jquery.com/UI/Autocomplete</a>
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <input id='example'/>
 *   <script type="text/javascript">
 *     $('#example').t11e_autocomplete({
 *       'source': ['Orange', 'Apple', 'Banana', 'Pear', 'Strawberry', 'Peach', 'Kiwi', 'Mango', 'Pineapple']
 *     });
 *   </script>
 * --></div>
 * @name jQuery.ui.t11e_autocomplete
 * @class Autocomplete widget that extends the jQuery UI Autocomplete widget to add client side caching and server side parameter pass through.
 */
(function ($) {
    var options = {
        'source_params': {}
    };
    $.widget('ui.t11e_autocomplete', {options: options});
    $.ui.t11e_autocomplete.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_autocomplete.prototype._init = function () {
        var self = this;
        $(self.element).autocomplete($.extend({}, self.options, {
            'source': $.t11e_local_caching_json_source(self.options.source, self.options.source_params)
        }));
    };
}(jQuery));
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview $.t11e_single_autocomplete definition
 */

/**
 * Autocomplete search widget that extends the t11e_textbox widget to
 * provide autocomplete functionality for a single term.
 *
 * <h2>Options</h2>
 * Passes through options to both t11e_autocomplete and t11e_textbox.
 *
 * <h2>Example</h2>
 * <div class="t11e-widget-example"><!--
 *   <input id="example" name="k">
 *   <script type="text/javascript">
 *     $('#example').t11e_single_autocomplete({
 *       'search_group': 'default',
 *       'value_param': 'myparam',
 *       'source': ['Orange', 'Apple', 'Banana', 'Pear', 'Strawberry', 'Peach', 'Kiwi', 'Mango', 'Pineapple']
 *     });
 *   </script>
 * --></div>
 *
 * @name jQuery.ui.t11e_single_autocomplete
 * @class Autocomplete search widget that extends the t11e_textbox widget to provide autocomplete functionality for a single term.
 */
(function ($) {
    var options = {
    };
    $.widget('ui.t11e_single_autocomplete', {options: options});
    $.ui.t11e_single_autocomplete.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_single_autocomplete.prototype._init = function () {
        var self = this;
        self.element.t11e_autocomplete(self.options);
        self.element.t11e_textbox(self.options);
        self.element.bind('autocompleteselect', function (event, ui) {
            $(self.element).change();
        });
    };
}(jQuery));
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview t11e.widget.jquery.TextBoxWidget definition
 */

t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

t11e.widget.jquery.text_highlighter = function ($, target, template, matcher) {
    var highlight_text_node = function (node) {
        var replacement = [];
        var expr = /\w+/g;
        var text = node.nodeValue;
        var last_pos = 0;
        while (null !== (match = expr.exec(text))) {
            var token = match[0];
            if (matcher(token)) {
                replacement.push(document.createTextNode(text.substring(last_pos, match.index)));
                var highlighted = $(template);
                highlighted.text(token);
                replacement.push(highlighted[0]);
                last_pos = match.index + token.length;
            }
        }
        if (replacement.length > 0) {
            replacement.push(document.createTextNode(text.substring(last_pos)));
            var parent = node.parentNode;
            for (var i = 0; i < replacement.length; i++) {
                parent.insertBefore(replacement[i], node);
            }
            parent.removeChild(node);
        }
    };
    var highlight_nodes = function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            highlight_text_node(node);
        } else {
            $(node.childNodes).each(function (i, elem) {
                highlight_nodes(elem);
            });
        }
    };
    highlight_nodes(target);
};

t11e.widget.jquery.text_token_filter_factory = function ($, tokens) {
//    var append_variant = function (target, token, before, after) {
//        var pos = token.lastIndexOf(before);
//        if (pos === token.length - before.length) {
//            var variant = token.substring(0, pos) + after;
//            if ($.inArray(variant, target) === -1) {
//                target.push(variant);
//            }
//        }
//    };
    var expanded_tokens = [];
    $(tokens).each(function (i, token) {
        if ($.inArray(token, expanded_tokens) === -1) {
            if (token.substr(token.length - 1, 1) === "*")
            {
                // deal with "startsWith" tokens
                expanded_tokens.push(token.substr(0, token.length - 1));
            } else {
                expanded_tokens.push(token);
            }
            // Manually duplicate some tokens with new suffixes if they
            // match, a partial reversion of step3 of the Porter stemmer
            // algorithm. Step2 y to i has been rolled into some of these.
//            append_variant(expanded_tokens, token, 'ive', 'iviti');
//            append_variant(expanded_tokens, token, 'ive', 'ivity');
//            append_variant(expanded_tokens, token, 'ble', 'biliti');
//            append_variant(expanded_tokens, token, 'ble', 'bility');
//            append_variant(expanded_tokens, token, 'ate', 'ator');
//            append_variant(expanded_tokens, token, 'ate', 'ation');
//            append_variant(expanded_tokens, token, 'ize', 'ization');
//            append_variant(expanded_tokens, token, 'ble', 'bli');
//            append_variant(expanded_tokens, token, 'ble', 'bly');
//            append_variant(expanded_tokens, token, 'ance', 'anci');
//            append_variant(expanded_tokens, token, 'ance', 'ancy');
//            append_variant(expanded_tokens, token, 'ence', 'enci');
//            append_variant(expanded_tokens, token, 'ence', 'ency');
//            append_variant(expanded_tokens, token, 'ate', 'ational');
        }
    });
    return function (token) {
        token = token.toLowerCase();
        var match = false;
        for (var i = 0; i < expanded_tokens.length; i++) {
            var expanded = expanded_tokens[i];
            if (token.indexOf(expanded) === 0) {
                match = true;
                break;
            }
        }
        return match;
    };
};
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview activate.js
 */
t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

t11e.widget.jquery.default_mappings = {
    '.t11e-widget-jquery-faceted-slider': 't11e_faceted_slider',
    '.t11e-widget-jquery-slider': 't11e_slider',
    '.t11e-widget-jquery-dual-slider': 't11e_dual_slider',
    '.t11e-widget-jquery-faceted-dual-slider': 't11e_faceted_dual_slider',
    '.t11e-widget-jquery-response': 't11e_response',
    '.t11e-widget-jquery-results': 't11e_results',
    '.t11e-widget-jquery-pagination': 't11e_pagination',
    '.t11e-widget-jquery-select': 't11e_select',
    '.t11e-widget-jquery-faceted-checkboxes': 't11e_faceted_checkboxes',
    '.t11e-widget-jquery-faceted-checkboxes2': 't11e_faceted_checkboxes2',
    '.t11e-widget-jquery-textbox': 't11e_textbox',
    '.t11e-widget-jquery-params': 't11e_params',
    '.t11e-widget-jquery-faceted-flyout': 't11e_faceted_flyout',
    '.t11e-widget-jquery-google-map': 't11e_google_map',
    '.t11e-widget-jquery-button': 't11e_button',
    '.t11e-widget-jquery-accordion': 't11e_accordion',
    '.t11e-widget-jquery-breadcrumb': 't11e_breadcrumb',
    '.t11e-widget-jquery-location': 't11e_location',
    '.t11e-jquery-ui-geocode': 't11e_geocode'
};

/**
 * All jQuery widgets need to be activated prior to their use, which is
 * accomplished by a call to the {@link t11e.widget.jquery.activate_widgets}
 * function in this module.
 * <p>
 *    Hooks up all UI elements to their
 *    JavaScript counterparts and creates the various helper objects that
 *    are used to dispatch search.
 *
 * @param $ jQuery
 */
t11e.widget.jquery.activate_widgets = function ($, widget_mappings) {
    if (t11e.util.is_undefined(widget_mappings)) {
        widget_mappings = t11e.widget.jquery.default_mappings;
    }
    var widgets = $('.t11e-widget');
    widgets.each(function () {
        t11e.widget.jquery.util.bind_widget_id.call(this, $);
    });
    $.each(widget_mappings, function (selector, widget_name) {
        var widget_fn = $.fn[widget_name];
        if (t11e.util.is_undefined(widget_fn)) {
            t11e.util.error('Undefined widget', widget_name, 'for widget selector', selector);
        } else {
            widgets.filter(selector).each(function () {
                try {
                    var options;
                    var widget_id = $(this).attr('t11e-widget-id');
                    if (t11e.util.is_defined(widget_id) &&
                        t11e.util.is_defined(t11e.widget_options)) {
                        options = t11e.widget_options[widget_id];
                    }
                    if (t11e.util.is_undefined(options)) {
                        options = {};
                    }
                    var pre_init = options.pre_init;
                    if (!t11e.util.is_function(pre_init)) {
                        pre_init = t11e.util.deref(window, pre_init);
                    }
                    if (t11e.util.is_defined(pre_init)) {
                        pre_init($, options);
                    }
                    widget_fn.call($(this), options);
                } catch (e) {
                    t11e.util.error('Problem creating widget', this, fn, e);
                }
            });
        }
    });
};
/**
 * @copyright Transparensee Systems, Inc.
 * @fileOverview document.js
 */
t11e.util.define_namespace('t11e.widget.jquery');
if (false) {
    t11e.widget.jquery.prototype.Eclipse__Outline__Hack = undefined;
}

/**
 * Finds all elements with a class of t11e-widget and copies the element and its
 * following script tag into a doc_wrapper html element (e.g. a pre tag) so that
 * the widget can be documented. Used by the JSDoc pages to document and show an
 * example widget which can easily be maintained in the JSDoc comment.
 */
(function ($) {
    var get_element_html = function ($, element) {
        var wrapper = $('<span/>');
        wrapper.append($(element).clone());
        return $(wrapper).html();
    };

    t11e.widget.jquery.document_widgets_1 = function ($, doc_wrapper) {
        doc_wrapper = doc_wrapper || '<span/>';
        $('.t11e-widget').each(function (index, element) {
            var widget_template_html = get_element_html($, element);
            var script_content = $(element).next('script').html();
            var documented_content = widget_template_html;
            if (script_content) {
                documented_content += '\n<script type="text/javascript">' + script_content + '</script>';
            }
            var target = $(doc_wrapper);
            $(target).text(documented_content);
            $(element).before(target);
        });
    };

    t11e.widget.jquery.document_widgets_2 = function ($, doc_wrapper) {
        doc_wrapper = doc_wrapper || '<span/>';
        $('.t11e-widget-example').each(function (index, element) {
            var first = element.firstChild;
            if (t11e.util.is_defined(first) && first.nodeType === first.COMMENT_NODE) {
                var example_content = first.nodeValue;
                var documentation = $(doc_wrapper);
                $(documentation).text(example_content);
                $(element).before(documentation);

                var widget = $(first.nodeValue);
                $(element).before(widget);
                $(element).remove();
            }
        });
    };
}(jQuery));
(function ($) {
    var options = {
        page_param: 'page',
        search_group: 'default'
    };
    $.widget('ui.t11e_search', {options: options});
    $.ui.t11e_search.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_search.prototype._subscribe_events = function () {
        var self = this;
        var o = self.options;
        self.ignore_event = false;
        t11e.event.subscribe('request.' + o.search_group, function (params) {
            self._load_params(params);
        });
        t11e.event.subscribe('clear_params_from_search.' + o.search_group,
            function (params) {
                self._clear_params(params);
            });
    };
    /*jslint nomen: false */
    $.ui.t11e_search.prototype._reset_pagination = function () {
        var self = this;
        delete params[self.options.page_param];
    };

    /*jslint nomen: false */
    $.ui.t11e_search.prototype._load_params = function (params) {};
    /*jslint nomen: false */
    $.ui.t11e_search.prototype._save_params = function (params) {};
    /*jslint nomen: false */
    $.ui.t11e_search.prototype._clear_params = function (params) {};

}(jQuery));
(function ($) {
    var options = {
        value: '',
        value_param: ''
    };
    $.widget('ui.t11e_input', $.ui.t11e_search, {options: options});
    $.ui.t11e_input.defaults = options;

    /*jslint nomen: false */
    $.ui.t11e_input.prototype._create = function () {
        var self = this;
        var o = self.options;

        $.ui.t11e_search.prototype._subscribe_events.apply(self, arguments);

        if (self.element.is('input[type="text"]') || self.element.is('input[type="hidden"]')) {
            if ('' === o.value_param) {
                var input_name = self.element.attr('name');
                if (t11e.util.is_defined(input_name) &&
                    '' !== input_name) {
                    o.value_param = input_name;
                }
            } else {
                self.element.attr('name', o.value_param);
            }
            self.element.addClass('t11e-widget-form' +
                ' ui-' + self.widgetName +
                ' ui-widget' +
                ' ui-widget-content');
            if (o.disabled) {
                self.element.addClass('ui-' + self.widgetName + '-disabled ui-disabled');
            }
            var changed = function (evt) {
                if (!self.ignore_event) {
                    t11e.event.trigger('update_request.' + o.search_group, function (params) {
                        self._save_params(params);
                    });
                }
            };
            self.element.bind('change', changed);
        } else {
            t11e.util.error('t11e_input widget must be a text input or hidden input');
        }
    };

    $.ui.t11e_input.prototype._load_params = function (params) {
        var self = this;
        var o = self.options;
        var values = params[o.value_param];
        var value = t11e.util.is_defined(values) ? values[0] : '';
        value = t11e.util.is_defined(value) ? value : '';
        self.ignore_event = true;
        try {
            self.value(value);
        } finally {
            self.ignore_event = false;
        }
    };

    $.ui.t11e_input.prototype._save_params = function (params) {
        var self = this;
        var o = self.options;
        var val = self.value();
        if ('' !== val && !o.disabled) {
            params[o.value_param] = [val];
        } else {
            delete params[o.value_param];
        }
        self._reset_pagination();
    };

    $.ui.t11e_input.prototype._clear_params = function (params) {
        var self = this;
        var o = self.options;
        delete params[o.value_param];
        delete params[o.page_param];
    };

    $.ui.t11e_input.prototype.value = function (value) {
        var self = this;
        var o = self.options;
        if (arguments.length) {
            o.value = $.trim(value);
            self.element.val(o.value);
            self.element.change();
        }
        return self.element.val();
    };

    $.ui.t11e_input.prototype.enable = function () {
        var self = this;
        $.Widget.prototype.enable.apply(self, arguments);
        self.attr('disabled', false);
        self.element.change();
    };

    $.ui.t11e_input.prototype.disable = function () {
        var self = this;
        $.Widget.prototype.disable.apply(self, arguments);
        self.element.attr('disabled', true);
        self.element.change();
    };

    $.ui.t11e_input.prototype.destroy = function (value) {
        var self = this;
        $.Widget.prototype.destroy.apply(this, arguments);
        self.element.removeClass('t11e-widget-form' +
            ' ui-' + self.widgetName +
            ' ui-widget' +
            ' ui-widget-content' +
            ' ui-' + self.widgetName + '-disabled'
        );
        return self;
    };
}(jQuery));
