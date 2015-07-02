
/* global gettext */
window.gettext = window.gettext || function(x){return x;};

// Declare app level module which depends on filters, and services
angular.module('proso.anatomy', [
    'proso.anatomy.filters',
    'proso.anatomy.services',
    'proso.anatomy.directives',
    'proso.anatomy.controllers',
    'proso.anatomy.map',
    'proso.anatomy.templates',
    'ngRoute',
    'ngAnimate',
    'angulartics',
    'angulartics.google.analytics',
    'ui.bootstrap',
    'googleExperiments',
    'xeditable',
    'proso.apps',
])

.value('gettext', gettext || function(x) {return x;})

.constant('domain', window.domain || '')

.config(['$routeProvider', '$locationProvider', 'googleExperimentsProvider',
    function($routeProvider, $locationProvider, googleExperimentsProvider) {
        'use strict';
        $routeProvider.when('/', {
            templateUrl : 'static/tpl/homepage.html'
        }).when('/login/:somepath/', {
            controller : 'ReloadController',
            templateUrl : 'loading.html'
        }).when('/about', {
            templateUrl : 'static/tpl/about.html'
        }).when('/view/', {
            redirectTo : '/view/world/'
        }).when('/view/:part/:user?', {
            controller : 'AppView',
            templateUrl : 'static/tpl/view_tpl.html'
        }).when('/practice/', {
            controller : 'AppPractice',
            templateUrl : 'static/tpl/practice_tpl.html'
        }).when('/refreshpractice/:part/:place_type?', {
            redirectTo : '/practice/:part/:place_type'
        }).when('/practice/:part/:place_type?', {
            controller : 'AppPractice',
            templateUrl : 'static/tpl/practice_tpl.html'
        }).when('/overview/:user?', {
            controller : 'AppOverview',
            templateUrl : 'static/tpl/overview_tpl.html'
        }).when('/u/:user', {
            controller : 'AppUser',
            templateUrl : 'static/tpl/user_tpl.html'
        }).when('/goals/', {
            templateUrl : 'static/tpl/personal-goals-page_tpl.html'
        }).when('/mistakes/', {
            controller : 'AppConfused',
            templateUrl : 'static/tpl/confused_tpl.html'
        }).otherwise({
          //redirectTo : '/'
        });

        var languages = ['cs', 'en', 'es'];
        for (var i = 0; i < languages.length; i++) {
            $routeProvider.when('/' + languages[i] + '/:somepath?', {
                controller : 'ReloadController',
                templateUrl : 'loading.html'
            }).when('/' + languages[i] + '/:somepath/:more?/:path?', {
                controller : 'ReloadController',
                templateUrl : 'loading.html'
            });
        }

        $locationProvider.html5Mode(true);

        googleExperimentsProvider.configure({
            experimentId: 'Z701yBLfTbakJh3W6vGdpg'
        });
    }
])

.run(['$rootScope', '$analytics', 'editableOptions', 'places',
    function($rootScope, $analytics, editableOptions, places) {
        'use strict';
        $analytics.settings.pageTracking.autoTrackFirstPage = false;

        editableOptions.theme = 'bs3';

        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            if (current && current.originalPath !== "" && $(window).width() < 770) {
                $("#nav-main").collapse();
                $("#nav-main").collapse('hide');
            }
        });
        
    }
]);
