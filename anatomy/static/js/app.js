// Declare app level module which depends on filters, and services
angular.module('proso.anatomy', [
    'angulartics',
    'angulartics.google.analytics',
    'angular-svg-round-progress',
    'gettext',
    'googleExperiments',
    'ngRoute',
    'ngAnimate',
    'ngCookies',
    'proso.anatomy.filters',
    'proso.anatomy.services',
    'proso.anatomy.directives',
    'proso.anatomy.controllers',
    'proso.anatomy.map',
    'proso.anatomy.templates',
    'proso.apps',
    'ui.bootstrap',
    'angularDjangoCsrf',
    'xeditable',
    'countTo',
])

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
        }).when('/view/:category/:user?', {
            controller : 'AppView',
            templateUrl : 'static/tpl/view_tpl.html'
        }).when('/practice/', {
            controller : 'AppPractice',
            templateUrl : 'static/tpl/practice_tpl.html'
        }).when('/refreshpractice/:category?/:category2?', {
            redirectTo : '/practice/:category/:category2'
        }).when('/practice/:category?/:category2?', {
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

.run(['$rootScope', '$analytics', 'editableOptions',
    function($rootScope, $analytics, editableOptions) {
        'use strict';
        $analytics.settings.pageTracking.autoTrackFirstPage = false;

        editableOptions.theme = 'bs3';

        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            if (current && current.originalPath !== "" && $(window).width() < 770) {
                $("#nav-main").collapse();
                $("#nav-main").collapse('hide');
            }
        });

        $rootScope.$on('questionSetFinished', function() {
          var checkPoints = configService.getConfig(
            'proso_feedback', 'evaluation_checkpoints', []);
          var answered_count = userService.user.profile.number_of_answers;
          var setLength = configService.getConfig('proso_flashcards', 'practice.common.          set_length', 10); 

          angular.forEach(checkPoints, function(checkPoint) {
            if (checkPoint - setLength < answered_count && answered_count <= checkPoint) {
              $rootScope.$emit("openRatingModal");
            }
          });
        });

    }
]);
