angular.module('proso.anatomy.controllers')

.controller('imageViewController', ['$scope', '$routeParams', 'contextService', 'imageService', 'flashcardService', 'colorScale',
    function($scope, $routeParams, contextService, imageService, flashcardService, colorScale) {
  'use strict';
  $scope.contextId = $scope.contextId || $routeParams.context;


  $scope.$watch('contextId', function() {
    if ($scope.contextId) {
      $scope.context = undefined;

      contextService.getContextByIdentifier($scope.contextId).then(function(data) {
        $scope.context = data;
      });
    }
  });

  $scope.$watch('context', function() {
    if ($scope.context) {
      imageService.setImage($scope.context.content, function(ic) {
        var filter = {
          filter : [
              ['context/' + $scope.contextId],
          ],
          stats : true,
          user : $routeParams.user,
        };
        $scope.imageController = ic;
        flashcardService.getFlashcards(filter).then(function(data) {
          $scope.context.flashcards = data;
          for (var i = 0; i < $scope.context.flashcards.length; i++) {
            var fc = $scope.context.flashcards[i];
            $scope.imageController.setColor(fc.description, colorScale(fc.prediction).hex());
          }
        });
      });
    }
  });
}]);

