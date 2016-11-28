angular.module('proso.anatomy.controllers')

.controller('viewController', ['$scope', '$routeParams', 'contextService', 'categoryService', 'userStatsService', '$cookies', '$location', '$rootScope',
    function($scope, $routeParams, contextService, categoryService, userStatsService, $cookies, $location, $rootScope) {
  'use strict';
  $scope.user = $routeParams.user || '';

  var filter = {
      filter : [ $routeParams.category ? ['category/' + $routeParams.category] : []],
  };
  filter.filter.push(['category/images']);

  categoryService.getAllByType().then(function(){
    $scope.category = categoryService.getCategory($routeParams.category);
    $scope.subcategories = categoryService.getSubcategories($routeParams.category);
  }, function() {
    $scope.error = true;
  });

  contextService.getContexts(filter).then(function(data) {
    $scope.contexts = data;
    $scope.countsLoaded = true;

    userStatsService.clean();
    for (var i = 0; i < data.length; i++) {
      var context = data[i];
      var id = context.identifier;
      userStatsService.addGroup(id, {});
      userStatsService.addGroupParams(id, filter.filter.concat([['context/' + id]]));
    }
    userStatsService.getStatsPost(true, $scope.user).success(function(data) {
      angular.forEach($scope.contexts, function(context) {
        context.placeTypes = [];
        var id = context.identifier;
        context.stats = data.data[id];
      });
        if ($routeParams.context) {
          var context = $scope.contexts.filter(function(c) {
            return c.identifier == $routeParams.context;
          })[0];
          if (context) {
            $scope.activateContext(context);
          } else {
            $location.path($location.path().replace(
              '/view/' + $routeParams.category, ''));
          }
        }
    });
  }, function() {
    $scope.error = true;
  });

  if ($routeParams.user == 'average') {
    filter.new_user_predictions = true;
  }

  var catId = $routeParams.category;
  userStatsService.clean();
  userStatsService.addGroup(catId, {});
  userStatsService.addGroupParams(catId, filter.filter);
  userStatsService.getStatsPost(true, $scope.user).success(function(data) {
    $scope.stats = data.data[catId];
  });

  $scope.activateContext = function(context) {
    if ($scope.user) {
      return;
    }
    $scope.activeContext = $scope.activeContext !== context ? context : undefined;
    $location.update_path('/view/' + $routeParams.category +
      ($scope.activeContext ? '/image/' + $scope.activeContext.identifier : ''));
    var contextName = $scope.activeContext ? context.name + ' - ' : '';
    setTimeout(function() {
      $rootScope.title = contextName + $rootScope.title;
    }, 10);
  };

  $scope.usePracticeDwopdown = function() {
    $cookies.practiceDropdownUsed = true;
  };
}]);
