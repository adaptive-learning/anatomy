angular.module('proso.anatomy.controllers')

.controller('imageGeneratorController', ['$scope', '$rootScope', 'contextService', 'imageService', '$timeout',
    function($scope, $rootScope, contextService, imageService, $timeout) {
  'use strict';
    contextService.getAllContexts().then(function(data) {
      $scope.contexts = data.data.data.filter(function(context, i) {
        return true || context.name.indexOf('Krajiny') != -1 || i < 20;
      });
      $scope.contexts.forEach(function(context) {
        contextService.getContext(context.id).then(function(data) {
          context.content = data.content;
          context.flashcards = data.flashcards;

          context.flashcards.forEach(function(fc) {
            fc.classSaveIdentifier = fc.identifier.replace(/\./g, '-');
            fc.context = context;
            $scope.fcQueue.push(fc);
          });
        });
      });
    });

    $scope.fcQueue = [];
    $scope.processQueue = function () {
      var fc = $scope.fcQueue.pop();
      if (fc) {
        fc.processed = true;
        imageService.setImage(fc.context.content, function(imageController) {
          imageController.clearHighlights();
          imageController.highlightItem(fc.description, '#ec1c24', false);
          $rootScope.$emit('imageDisplayed', fc.classSaveIdentifier, true);

          console.log(fc.term.name, fc.classSaveIdentifier);
          if ($scope.fcQueue.length) {
            $timeout($scope.processQueue, 10);
          }
        });
      } else {
        $timeout($scope.processQueue, 1000);
      }
    };
    $scope.processQueue();
}]);


