angular.module('proso.anatomy.controllers')

.controller('imageViewPageController', ['$scope', '$routeParams', 'contextService', 'imageService', 'flashcardService', 'colorScale',
    function($scope, $routeParams, contextService, imageService, flashcardService, colorScale) {
  'use strict';
  $scope.contextId = $routeParams.context;
}]);


