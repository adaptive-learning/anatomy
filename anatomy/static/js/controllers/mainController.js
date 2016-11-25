angular.module('proso.anatomy.controllers')

.controller('mainController', ['$scope', '$rootScope', 'userService', 'pageTitle', 'configService', 'gettextCatalog', '$location', 'categoryService', 'termsLanguageService',
    function($scope, $rootScope, userService, pageTitle, configService, gettextCatalog, $location, categoryService, termsLanguageService) {
  'use strict';
  $scope.configService = configService;
  $rootScope.userService = userService;
  $rootScope.$location = $location;

  $rootScope.initTitle = function (title) {
      $rootScope.initialTitle = title;
      $rootScope.title = title;
  };

  $rootScope.$on("$routeChangeStart", function(event, next) {
    categoryService.getAllByType().then(function(){
      $rootScope.title = pageTitle(next, $rootScope.initialTitle);
    });
  });

  $scope.initLanguageCode = function (code) {
      gettextCatalog.setCurrentLanguage(code);
      $rootScope.LANGUAGE_CODE = code;
      termsLanguageService.init(code);
  };
  if ($location.search().sessionid) {
    userService.loadUser();
    $location.search('sessionid', undefined);
  } else {
    $scope.initUser = function (data) {
        userService.processUser(data);
    };
  }

  $scope.setStats = function(stats) {
      $rootScope.stats = stats;
  };

  $scope.logout = function() {
      $rootScope.user = userService.logout();
  };
}]);
