'use strict';
var $ = require('jquery-browserify');
var fs = require('fs');
var hyperglue = require('hyperglue');

/* globals window, document, Image */

var html = fs.readFileSync('./assets/facebox.html');
var loadingImage = fs.readFileSync('./assets/loading_base64.txt');
var closeImage = fs.readFileSync('./assets/closelabel_base64.txt');

var settings = {
    opacity      : 0.2,
    overlay      : true,
    loadingImage : '',
    closeImage   : '',
    imageTypes   : [ 'png', 'jpg', 'jpeg', 'gif' ],
    faceboxHtml  : html
};

var $document = $(document);

function facebox(data, klass) {
    loading();

    if (data.ajax) {
        fillFaceboxFromAjax(data.ajax, klass);
    } else if (data.image) {
        fillFaceboxFromImage(data.image, klass);
    } else if (data.div) {
        fillFaceboxFromHref(data.div, klass);
    } else if ('function' === typeof data) {
        data.call($);
    } else {
        reveal(data, klass);
    }
}

function setup(selector, settings) {
    var $elem = $(selector);
    console.log($elem);
    if ($elem.length === 0) { return; }
    console.log('facebox setup');

    init(settings);

    function clickHandler(e) {
        var target = e.currentTarget;
        loading(true);

        // support for rel="facebox.inline_popup" syntax, to add a class
        // also supports deprecated "facebox[.inline_popup]" syntax
        var klass = target.rel.match(/facebox\\[?\\.(\\w+)\\]?/);
        if (klass) {
            klass = klass[1];
        }
        fillFaceboxFromHref(target.href, klass);
        e.preventDefault();
    }

    return $elem.bind('click.facebox', clickHandler);
}

// Public, $.facebox methods

function loading() {
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

function reveal(data, klass) {
    $document.trigger('beforeReveal.facebox');

    if (klass) {
        $('#facebox .content').addClass(klass);
    }
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

// called one time to setup facebox on this page
function init(options) {
    if (settings.inited) {
        return true;
    } else {
        settings.inited = true;
    }

    $document.trigger('init.facebox');

    var imageTypes = settings.imageTypes.join('|');
    settings.imageTypesRegexp = new RegExp('\.(' + imageTypes + ')$', 'i');

    if (settings) {$.extend(settings, options); }
    var html = hyperglue(settings.faceboxHtml, {
        '.closebtn': {
            src: closeImage
        }
    });

    $('body').append(html);

    var preload = [ new Image(), new Image() ];
    preload[0].src = settings.closeImage;
    preload[1].src = settings.loadingImage;

    $('#facebox').find('.b:first, .bl').each(function () {
        preload.push(new Image());
        preload.slice(-1).src = $(this).css('background-image').replace(/url\((.+)\)/, '$1');
    });

    $('#facebox .close').click(close);
    $('#facebox .close_image').attr('src', settings.closeImage);
    insertStyle();
}

function insertStyle() {
    var css = fs.readFileSync('./facebox.css');

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
function fillFaceboxFromHref(href, klass) {
    // div
    if (href.match(/#/)) {
        var url    = window.location.href.split('#')[0];
        var target = href.replace(url, '');
        if (target === '#') { return; }
        reveal($(target).html(), klass);

    // image
    } else if (href.match($.facebox.settings.imageTypesRegexp)) {
        fillFaceboxFromImage(href, klass);
    // ajax
    } else {
        fillFaceboxFromAjax(href, klass);
    }
}

function fillFaceboxFromImage(href, klass) {
    var image = new Image();
    image.onload = function () {
        reveal('<div class="image"><img src="' + image.src + '" /></div>', klass);
    };
    image.src = href;
}

function fillFaceboxFromAjax(href, klass) {
    $.get(href, function (data) {
        reveal(data, klass);
    });
}

function skipOverlay() {
    return !settings.overlay || settings.opacity === null;
}

function showOverlay() {
    if (skipOverlay()) { return; }

    var $overlay = $('#facebox_overlay');

    if ($overlay.length === 0) {
        $("body").append('<div id="facebox_overlay" class="facebox_hide"></div>');
    }

    $overlay.hide().addClass("facebox_overlayBG");
    $overlay.css('opacity', settings.opacity);
    $overlay.click(function () { $document.trigger('close.facebox'); });
    $overlay.fadeIn(200);
    return false;
}

function hideOverlay() {
    if (skipOverlay()) { return; }

    var $overlay = $('#facebox_overlay');
    $overlay.fadeOut(200, function () {
        $overlay.removeClass("facebox_overlayBG");
        $overlay.addClass("facebox_hide");
        $overlay.remove();
    });

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

