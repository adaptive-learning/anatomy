angular.module('proso.anatomy.controllers')

.controller('overviewController', ['$scope', '$routeParams', 'categoryService', 'userStatsService', 'gettextCatalog', '$cookies', '$filter', '$location', 'userService',
    function($scope, $routeParams, categoryService, userStatsService, gettextCatalog, $cookies, $filter, $location, userService) {
  'use strict';

  function getProgressRadius() {
    var radius =  $('.tile').width() / 2;
    return radius;
  }
  $scope.absUrl = $location.absUrl();
  var overviewType = $location.path().split('/')[1];
  var activeTypeCookieName = overviewType + 'activeType';
  var selectedCategoriesCookieName = overviewType + 'selectedCategoires';
  if (overviewType == 'overview') {
    $scope.viewPath = 'view';
    $scope.practicePath = 'practice';
    $scope.disabled = false;
    $scope.allCategory = 'images';
    $scope.defaultTab = 'system';
    $scope.secondTab = 'location';
    $scope.headline = gettextCatalog.getString("Přehled znalostí");
  } else {
    $scope.viewPath = 'relations';
    $scope.practicePath = 'practice/relations';
    $scope.disabled = !userService.user.profile.subscribed;
    $scope.allCategory = 'relations';
    $scope.defaultTab = 'relation';
    $scope.secondTab = 'location';
    $scope.headline = gettextCatalog.getString("Souvislosti");
  }

  $scope.activateCatType = function(categoryType) {
    angular.forEach($scope.categoriesByType, function(ct) {
      ct.isActive = ct == categoryType;
    });
    $cookies[activeTypeCookieName] = categoryType.categories[0] && categoryType.categories[0].type;
  };

  $scope.toggleSelectedCategories = function(selected) {
    angular.forEach($scope.categories, function(c) {
      c.selected = selected;
    });
    $scope.saveSelectedCategoriesToCookie();
  };

  $scope.saveSelectedCategoriesToCookie = function() {
    var selected = $filter('getSelectedIdentifiers')($scope.categories);
    $cookies[selectedCategoriesCookieName] = selected;
  };

  function isActive(categoryType) {
    if ($routeParams.tab && $routeParams.tab != $cookies[activeTypeCookieName]){
      $cookies[activeTypeCookieName] = $routeParams.tab;
    }
    return $cookies[activeTypeCookieName] == categoryType ||
      (categoryType == $scope.defaultTab && !$cookies[activeTypeCookieName]);
  }

  $scope.user = $routeParams.user || '';
  categoryService.getAllByType().then(function(categoriesByType){
      $scope.categories = categoriesByType.system.concat(
        categoriesByType.location).concat(categoriesByType.relation);
      $scope.categoriesByType = [ {
        name: gettextCatalog.getString('Části těla'),
        categories : categoriesByType.location,
        isActive : isActive('location'),
      }];
      if ($location.path().indexOf('relations') === -1) {
        $scope.categoriesByType.unshift({
          name: gettextCatalog.getString('Orgánové systémy'),
          categories : categoriesByType.system,
          isActive : isActive('system'),
        });
      } else {
        $scope.categoriesByType.unshift({
          name: gettextCatalog.getString('Souvislosti'),
          categories : categoriesByType.relation,
          isActive : isActive('relation'),
        });
      }
      userStatsService.clean();
      userStatsService.addGroup('all', []);
      userStatsService.addGroupParams('all', [['category/' + $scope.allCategory]]);
      for (var i = 0; i < $scope.categories.length; i++) {
        var cat = $scope.categories[i];
        var id = cat.identifier;
        userStatsService.addGroup(id, {});
        userStatsService.addGroupParams(id, [
          ['category/' + $scope.allCategory],
          ['category/' + cat.identifier]]);

        cat.selected = ($cookies[selectedCategoriesCookieName] + '').indexOf(id) != -1;
      }

      userStatsService.getStatsPost(true, $scope.user).success(processStats);

      function processStats(data) {
        $scope.progressRadius = getProgressRadius();
        $scope.userStats = data.data;
        $scope.stats = {};
        angular.forEach($scope.categories, function(map) {
          map.placeTypes = [];
          var key = map.identifier;
          map.stats = data.data[key];
        });
        $scope.stats = data.data.all;
        $scope.statsLoaded = true;
      }
  }, function(){
    $scope.error = true;
  });
}]);
