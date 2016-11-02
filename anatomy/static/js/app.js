// Declare app level module which depends on filters, and services
angular.module('proso.anatomy', [
    'angulartics',
    'angulartics.google.analytics',
    'angular-svg-round-progress',
    'gettext',
    'googleExperiments',
    'infinite-scroll',
    'ngRoute',
    'ngAnimate',
    'ngCookies',
    'ngSanitize',
    'ngLocationUpdate',
    'proso.anatomy.filters',
    'proso.anatomy.services',
    'proso.anatomy.directives',
    'proso.anatomy.controllers',
    'proso.anatomy.templates',
    'proso.apps',
    'smoothScroll',
    'ui.bootstrap',
    'angularDjangoCsrf',
    'xeditable',
    'countTo',
    'cfp.hotkeys',
])

.constant('domain', window.domain || '')

.config(['$routeProvider', '$locationProvider', 'googleExperimentsProvider', '$analyticsProvider',
    function($routeProvider, $locationProvider, googleExperimentsProvider, $analyticsProvider) {
        'use strict';
        $routeProvider.when('/', {
            templateUrl : 'static/tpl/homepage.html'
        }).when('/home', {
            templateUrl : 'static/tpl/homepage.html'
        }).when('/_=_', {
            redirectTo : '/overview/'
        }).when('/login/:somepath/', {
            controller : 'ReloadController',
            templateUrl : 'loading.html'
        }).when('/subscription/subscribe/:somepath?', {
            controller : 'ReloadController',
            templateUrl : 'loading.html'
        }).when('/about', {
            templateUrl : 'static/tpl/about.html'
        }).when('/terms-of-use-cs', {
            templateUrl : 'static/tpl/terms_of_use_cs.html'
        }).when('/terms-of-use-en', {
            templateUrl : 'static/tpl/terms_of_use_en.html'
        }).when('/privacy-policy-cs', {
            templateUrl : 'static/tpl/privacy_policy_cs.html'
        }).when('/privacy-policy-en', {
            templateUrl : 'static/tpl/privacy_policy_en.html'
        }).when('/offer', {
            templateUrl : 'static/tpl/offer.html'
        }).when('/unauthorized/', {
            templateUrl : 'static/tpl/unauthorized.html'
        }).when('/view/:category?/image/:context?', {
            controller : 'AppView',
            templateUrl : 'static/tpl/view_tpl.html'
        }).when('/view/:category?/:user?', {
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
        }).when('/overview/tab/:tab', {
            controller : 'AppOverview',
            templateUrl : 'static/tpl/overview_tpl.html'
        }).when('/overview/:user?', {
            controller : 'AppOverview',
            templateUrl : 'static/tpl/overview_tpl.html'
        }).when('/relationsoverview/:user?', {
            controller : 'AppOverview',
            templateUrl : 'static/tpl/overview_tpl.html'
        }).when('/u/:user', {
            controller : 'AppUser',
            templateUrl : 'static/tpl/user_tpl.html'
        }).when('/premium/', {
            controller : 'PremiumController',
            templateUrl : 'static/tpl/premium.html'
        }).when('/settings/', {
            controller : 'SettingsController',
            templateUrl : 'static/tpl/settings.html'
        }).when('/relations/:category?/:user?', {
            controller : 'RelationsController',
            templateUrl : 'static/tpl/relations.html'
        }).otherwise({
            templateUrl : 'static/tpl/404.html'
        });

        var languages = ['cs', 'en'];
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
            experimentId: 'UerhSQbmRoi890TNRKcmtg'
        });

        $analyticsProvider.registerPageTrack(function (path) {

            var pageTrackArray = [];
            pageTrackArray.push('virtualPage');

            if(path){
                pageTrackArray.push({url : path});
            }

          if(window.__insp) {
            window.__insp.push(pageTrackArray);
          }

        });
    }
])

.config(['hotkeysProvider', function(hotkeysProvider) {
  hotkeysProvider.includeCheatSheet = false;
}])

.run(['$rootScope', '$analytics', 'editableOptions', 'configService', 'userService',
    function($rootScope, $analytics, editableOptions, configService, userService) {
        'use strict';
        $analytics.settings.pageTracking.autoTrackFirstPage = false;

        editableOptions.theme = 'bs3';

        $rootScope.$on('questionSetFinished', function() {
          var checkPoints = configService.getConfig(
            'proso_feedback', 'evaluation_checkpoints', []);
          var answered_count = userService.user.profile.number_of_answers;
          var setLength = configService.getConfig('proso_models', 'practice.common.          set_length', 10); 

          angular.forEach(checkPoints, function(checkPoint) {
            if (checkPoint - setLength < answered_count && answered_count <= checkPoint) {
              $rootScope.$emit("openRatingModal");
            }
          });
          $analytics.eventTrack('eventName', {
            category: 'practice',
            action: 'finished',
            value: answered_count,
          });
        });
}])

.run(['$rootScope', 'userService', '$location',
    function($rootScope, userService, $location) {
  $rootScope.$on('$locationChangeStart', function(event, next) {
    if (!userService.user.profile.subscribed && 
        next.indexOf('/relations') !== -1 &&
        next.indexOf('/relationsoverview') === -1 &&
        next.indexOf('/demo') === -1) {
      $location.replace();
      $location.path('/unauthorized/');
    }
  });
}])

.run(['$rootScope', '$window', function($rootScope, $window) {
  $rootScope.$on('userLogin', function() {
    console.log('userLogin');
    $window.location.reload();
  });
}]);
