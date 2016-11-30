angular.module('proso.anatomy.controllers')

.controller('tileController', ['$scope', '$element', '$timeout', 'thumbnailService',
    function($scope, $element, $timeout, thumbnailService) {
    'use strict';
  $element.bind({
      "mouseover": wasHovered, 
      "touchstart": wasHovered, 
  });

  function wasHovered(){
    if (!$scope.wasHovered) {
      $scope.$apply(function () {
        $scope.wasHovered = true;
      });
    }
  }

  $scope.getProgressRadius = function() {
    var radius =  Math.max(0, $element[0].clientWidth / 2 - 5);
    return radius;
  };

  $scope.clickFn = function(event) {
    if ($scope.clickAction) {
      $scope.clickAction($scope.category);
      event.preventDefault();
    }
  }; 

  $scope.bigThumbnail = $scope.thumbnailPath + $scope.category.identifier + '.png';
  $scope.thumbnail = thumbnailService.getThumbnail($scope.bigThumbnail);

  var img  = new Image();
  img.src = $scope.bigThumbnail;
  img.onload = function() {
    $scope.thumbnail = $scope.bigThumbnail;
  };
  
  angular.element(window).bind('resize', function() {
    $scope.$apply(function () {
      $scope.progressRadius = $scope.getProgressRadius();
    });
  });

  $timeout(function() {
    $scope.progressRadius = $scope.getProgressRadius();
    $scope.showProgress = true;
  }, $scope.index * 100 + 1000);
}]);

