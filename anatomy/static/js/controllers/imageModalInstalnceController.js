angular.module('proso.anatomy.controllers')

.controller('imageModalInstanceController', ['$scope', '$modalInstance', 'data', 'contextService', '$location',
    function ($scope, $modalInstance, data, contextService, $location) {
  $scope.contextId = data.contextId || data.context.identifier;
  $scope.context = data.context;
  $scope.contexts = data.contexts || [];
  prefetchContext(+1);

  $scope.close = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.next = function() {
    setNextContext(+1);
    prefetchContext(+2);
  };

  $scope.prew = function() {
    setNextContext(-1);
    prefetchContext(-2);
  };

  function setNextContext(n) {
    var nextContext = getNextContext(n);
    $scope.context = nextContext;
    $scope.contextId = nextContext.identifier;
    setPath();
  }

  function setPath() {
    console.log('yupdate', data);
    if (data.category) {
      $location.update_path('/view/' + data.category.identifier +
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

