angular.module('proso.anatomy.controllers')

.controller('imageGeneratorController', ['$scope', '$rootScope', 'contextService', 'imageService',
    function($scope, $rootScope, contextService, imageService) {
  'use strict';
    contextService.getAllContexts().then(function(data) {
      $scope.contexts = data.data.data;
      $scope.contexts.forEach(function(context) {
        contextService.getContext(context.id).then(function(data) {
          context.content = data.content;
          imageService.setImage(context.content, function() {
            $rootScope.$emit('imageDisplayed', context.identifier, true);
          });
        });
      });
    });
}]);


