angular.module('proso.anatomy.controllers')

.controller('relationsController', ['$scope',  '$routeParams', 'categoryService', 'contextService', 'userStatsService', 'flashcardService',
    function($scope, $routeParams, categoryService, contextService, userStatsService, flashcardService) {
  $scope.user = $routeParams.user || '';
  var category = 'relations';
  var subcategory;

  var filter = {
      filter : [['category/' + category]],
  };

  if ($routeParams.category) {
      subcategory = $routeParams.category;
      filter.filter.push(['category/' + $routeParams.category]);
  }

  categoryService.getAllByType().then(function(){
    $scope.category = categoryService.getCategory(category);
    if (subcategory) {
      $scope.subcategory = categoryService.getCategory(subcategory);
    }

    $scope.subcategories = categoryService.getSubcategories(
      (subcategory == 'foramina') ?
      subcategory :
      category);

    flashcardService.getFlashcards(
            angular.extend(filter, {with_contexts:true})).then(function(data) {
        $scope.flashcards = data;
        $scope.parseRelations();

        flashcardService.getFlashcards(
            angular.extend(filter, {stats:true})).then(function(data) {
          $scope.flashcards = data;
          $scope.flashcards.forEach(function(fc) {
            var originalFc = $scope.flashcardsById[fc.id];
            if (originalFc) {
              originalFc.prediction = fc.prediction;
              originalFc.practiced = fc.practiced;
              originalFc.mastered = fc.mastered;
            }
          });
          makeRelationsStats();
        });
    });
  });

  function makeRelationsStats() {
    $scope.relations.forEach(function(relation) {
      var mastered = 0;
      var practiced = 0;
      var total = 0;
      for (var i = 0; i < $scope.subcategories.length; i++) {
        var c = $scope.subcategories[i].identifier;
        if (!relation[c]) {
          continue;
        }
        for (var j = 0; j < relation[c].length; j++) {
          mastered += relation[c][j].mastered;
          practiced += relation[c][j].practiced;
          total++;
        }
      }
      relation.stats = {
        number_of_practiced_items: practiced,
        number_of_mastered_items: mastered,
        number_of_items: total
      };
    });
  }

  $scope.parseRelations = function() {
    var relationsByMuscle = {};
    $scope.flashcardsById = {};
    $scope.flashcards.forEach(function(fc) {
      var relationsObj = relationsByMuscle[fc.term.identifier] || {};
      relationsObj.primaryTerm = fc.term;
      relationsObj[fc.context.identifier] = relationsObj[fc.context.identifier] || [];
      var fc_secondary = angular.copy(fc);
      fc_secondary.term = fc_secondary.term_secondary;
      relationsObj[fc.context.identifier].push(fc_secondary);
      relationsByMuscle[fc.term.identifier] = relationsObj;
      $scope.flashcardsById[fc_secondary.id] = fc_secondary;
    });
    $scope.relations = [];
    for (var i in relationsByMuscle) {
      $scope.relations.push(relationsByMuscle[i]);
    }
    $scope.relations = $scope.relations.sort(function(a, b) {
      return a.primaryTerm.name < b.primaryTerm.name ? -1 : 1;
    });
  };

  $scope.activateRelation = function(relation) {
    if ($scope.user) {
      return;
    }
    $scope.activeRelation = $scope.activeRelation !== relation ? relation : undefined;
  };

  var catId = category;
  userStatsService.clean();
  userStatsService.addGroup(catId, {});
  userStatsService.addGroupParams(catId, filter.filter);
  userStatsService.getStatsPost(true, $scope.user).success(function(data) {
    $scope.stats = data.data[catId];
  });

  $scope.rowsLimit = 30;
  $scope.addRows = function() {
    if ($scope.relations && $scope.rowsLimit < $scope.relations.length) {
      $scope.rowsLimit += 30;
    }
  };
}]);
