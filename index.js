'use strict';
var $ = require('jquery-browserify');
var fs = require('fs');
var hyperglue = require('hyperglue');

/* globals window, document, Image */

var faceboxHtml = fs.readFileSync('./assets/facebox.html');
var loadingImage = 'data:image/gif;base64,' + fs.readFileSync('./assets/loading.gif', 'base64');
var closeImage = 'data:image/png;base64,' + fs.readFileSync('./assets/closelabel.png', 'base64');

var settings = {
    opacity      : 0.2,
    overlay      : true,
    loadingImage : '',
    closeImage   : '',
    imageTypes   : new RegExp('\.(png|jpg|jpeg|gif)$', 'i')
};

var $document = $(document);

function facebox(data, klass) {
    loading();


    if (data.ajax) {
        fillFaceboxFromAjax(data.ajax);
    } else if (data.image) {
        fillFaceboxFromImage(data.image);
    } else if (data.div) {
        fillFaceboxFromHref(data.div);
    } else if ('function' === typeof data) {
        data.call($);
    } else {
        reveal(data);
    }

    if (klass) {
        $('#facebox .content').addClass(klass);
    }
}

function setup(selector, settings) {
    var $elem = $(selector);
    if ($elem.length === 0) { return; }

    init(settings);

    function clickHandler(e) {
        var target = e.currentTarget;
        loading(true);

        fillFaceboxFromHref(target.href);
        e.preventDefault();
    }

    return $elem.bind('click.facebox', clickHandler);
}

// Public, facebox methods
function loading() {
    // just in case facebox is not initialized
    init();

    if ($('#facebox .loading').length === 1) { return true; }
    showOverlay();

    var $content = $('#facebox .content');
    var loadingHtml = '<div class="loading"><img src="' + loadingImage + '"/></div>';
    $content.empty();
    $content.append(loadingHtml);

    $('#facebox').css({
        top:	getPageScroll()[1] + (getPageHeight() / 10),
        left:	$(window).width() / 2 - 205
    }).show();

    $document.bind('keydown.facebox', function (e) {
        if (e.keyCode === 27) {
            close();
        }
        return true;
    });
    $document.trigger('loading.facebox');
}

function reveal(data) {
    $document.trigger('beforeReveal.facebox');

    $('#facebox .content').append(data);
    $('#facebox .loading').remove();
    $('#facebox .popup').children().fadeIn('normal');
    $('#facebox').css('left', $(window).width() / 2 - ($('#facebox .popup').width() / 2));
    $document.trigger('reveal.facebox').trigger('afterReveal.facebox');
}

function close() {
    $document.trigger('close.facebox');
    return false;
}

// Private methods

var inited = false;
// called one time to setup facebox on this page
function init(options) {
    if (inited) { return true; }
    inited = true;

    $document.trigger('init.facebox');

    if (options) {
        $.extend(settings, options);
    }

    $('body').append(hyperglue(faceboxHtml, {
        '.closebtn': {
            src: closeImage
        }
    }));

    if (!skipOverlay()) {
        $('#facebox_overlay').css('opacity', settings.opacity);
        $('#facebox_overlay').click(function () { $document.trigger('close.facebox'); });
    }

    $('#facebox .close').click(close);
    $('#facebox .close_image').attr('src', settings.closeImage);
    insertStyle();
}

function insertStyle() {
    var css = fs.readFileSync('./assets/facebox.css');

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');

    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style); 
}

// getPageScroll() by quirksmode.com
function getPageScroll() {
    var xScroll, yScroll;
    if (window.pageYOffset) {
        yScroll = window.pageYOffset;
        xScroll = window.pageXOffset;

    // Explorer 6 Strict
    } else if (document.documentElement && document.documentElement.scrollTop) {
        yScroll = document.documentElement.scrollTop;
        xScroll = document.documentElement.scrollLeft;
    } else if (document.body) {// all other Explorers
        yScroll = document.body.scrollTop;
        xScroll = document.body.scrollLeft;
    }
    return new Array(xScroll, yScroll);
}

// Adapted from getPageSize() by quirksmode.com
function getPageHeight() {
    var windowHeight;
    if (window.innerHeight) {	// all except Explorer
        windowHeight = window.innerHeight;

    // Explorer 6 Strict Mode
    } else if (document.documentElement && document.documentElement.clientHeight) {
        windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
        windowHeight = document.body.clientHeight;
    }
    return windowHeight;
}

// Figures out what you want to display and displays it
// formats are:
//     div: #id
//   image: blah.extension
//    ajax: anything else
function fillFaceboxFromHref(href) {
    // div
    if (href.match(/#/)) {
        var url    = window.location.href.split('#')[0];
        var target = href.replace(url, '');
        if (target === '#') { return; }
        reveal($(target).html());

    // image
    } else if (href.match($.facebox.settings.imageTypesRegexp)) {
        fillFaceboxFromImage(href);
    // ajax
    } else {
        fillFaceboxFromAjax(href);
    }
}

function fillFaceboxFromImage(href) {
    var image = new Image();
    image.onload = function () {
        reveal('<div class="image"><img src="' + image.src + '" /></div>');
    };
    image.src = href;
}

function fillFaceboxFromAjax(href) {
    $.get(href, function (data) {
        reveal(data);
    });
}

function skipOverlay() {
    return !settings.overlay || settings.opacity === null;
}

function showOverlay() {
    if (skipOverlay()) { return; }

    var $overlay = $('#facebox_overlay');
    $overlay.fadeIn(200);
    return false;
}

function hideOverlay() {
    if (skipOverlay()) { return; }

    var $overlay = $('#facebox_overlay');
    $overlay.fadeOut(200);

    return false;
}

// Bindings

$document.bind('close.facebox', function () {
    $document.unbind('keydown.facebox');
    $('#facebox').fadeOut(function () {
        $('#facebox .content').removeClass().addClass('content');
        $('#facebox .loading').remove();
        $document.trigger('afterClose.facebox');
    });
    hideOverlay();
});

module.exports = facebox;
module.exports.setup = setup;
module.exports.loading = loading;
module.exports.reveal = reveal;
module.exports.close = close;

