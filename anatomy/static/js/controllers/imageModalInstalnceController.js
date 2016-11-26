angular.module('proso.anatomy.controllers')

.controller('imageModalInstanceController', ['$scope', '$modalInstance', 'data', 'contextService', '$location',
    function ($scope, $modalInstance, data, contextService, $location) {
  $scope.contextId = data.contextId || data.context.identifier;
  $scope.context = data.context;
  $scope.contexts = data.contexts || [];
  $scope.category = data.category;
  
  prefetchContext(+1);

  $scope.close = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.setNextContext = function(n) {
    var nextContext = getNextContext(n);
    $scope.context = nextContext;
    $scope.contextId = nextContext.identifier;
    setPath();
    prefetchContext(n * 2);
  };

  function setPath() {
    if ($scope.category) {
      $location.update_path('/view/' + $scope.category.identifier +
        ($scope.context ? '/image/' + $scope.context.identifier : ''));
    }
  }

  function getNextContext(n) {
   return $scope.contexts[($scope.contexts.indexOf($scope.context) + n + $scope.contexts.length) % $scope.contexts.length];
  }

  function prefetchContext(n) {
    var context = getNextContext(n);
    contextService.getContextByIdentifier(context.identifier);
  }

}]);

