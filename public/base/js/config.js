requirejs.config({
    baseUrl : 'js/',
    paths   : {
        'knockout'  : 'vendor/knockout.min',
        'jquery'    : 'vendor/jquery.min',
        'jquery-ui' : 'vendor/jquery-ui-core.min'
    },
    shim: {
        'vendor/jquery-resize.min': ['jquery'],
        'knockout': ['jquery'],
        'jquery-ui': ['jquery'],
        'index': {
            exports: 'app'
        }
    }
});