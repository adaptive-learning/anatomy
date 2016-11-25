angular.module('proso.anatomy.controllers')

.controller('viewController', ['$scope', '$routeParams', 'contextService', 'flashcardService', 'categoryService', 'userStatsService', 'imageService', 'colorScale', '$cookies', 'smoothScroll', '$location', '$rootScope',
    function($scope, $routeParams, contextService, flashcardService, categoryService, userStatsService, imageService, colorScale,  $cookies, smoothScroll, $location, $rootScope) {
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
      console.log(id, filter.filter.concat([['context/' + id]]));
    }
    userStatsService.getStatsPost(true, $scope.user).success(function(data) {
      angular.forEach($scope.contexts, function(context) {
        context.placeTypes = [];
        var id = context.identifier;
        context.stats = data.data[id];
        if ($routeParams.context && $routeParams.context == id) {
          $scope.activateContext(context);
        }
      });
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
    if ($scope.activeContext) {
      setTimeout(function() {
        var elem = document.getElementById(context.identifier);
        smoothScroll(elem, {
          offset: 10,
          duration: 200,
        });
      }, 400);
      var filter = {
        filter : [
            ['context/' + context.identifier],
        ],
        stats : true,
        user : $routeParams.user,
      };
      if($routeParams.category) {
          filter.filter.push(['category/' + $routeParams.category]);
      }
      var activeContext = $scope.activeContext;
      contextService.getContext(context.id).then(function(fullContext) {
        if (activeContext != $scope.activeContext) {
          return;
        }
        $scope.activeContext.content = fullContext.content;
        $scope.activeContext.flashcards = fullContext.flashcards.map(function(fc) {
          fc.context = context;
          return fc;
        });
        if ($scope.activeContext.content.paths) {
          imageService.setImage($scope.activeContext.content, function(ic) {
            $scope.imageController = ic;
            flashcardService.getFlashcards(filter).then(function(data) {
              context.flashcards = data;
              for (var i = 0; i < context.flashcards.length; i++) {
                var fc = context.flashcards[i];
                $scope.imageController.setColor(fc.description, colorScale(fc.prediction).hex());
              }
            });
          });
        } else {
          flashcardService.getFlashcards(filter).then(function(data) {
            context.flashcards = data.map(function(fc) {
              fc.context = context;
              return fc;
            });
          });
        }
      });
    }
  };

  $scope.usePracticeDwopdown = function() {
    $cookies.practiceDropdownUsed = true;
  };
}]);
