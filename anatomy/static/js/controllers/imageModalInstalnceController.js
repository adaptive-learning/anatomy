angular.module('proso.anatomy.controllers')

.controller('imageModalInstanceController', ['$scope', '$modalInstance', 'contextId', 'context', 'contexts', 'contextService',
    function ($scope, $modalInstance, contextId, context, contexts, contextService) {
  $scope.contextId = contextId || context.identifier;
  $scope.context = context;
  $scope.contexts = contexts || [];
  prefetchContext(+1);

  $scope.close = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.next = function() {
    var nextContext = getNextContext(+1);
    $scope.context = nextContext;
    $scope.contextId = nextContext.identifier;
    prefetchContext(+2);
  };

  $scope.prew = function() {
    var nextContext = getNextContext(-1);
    $scope.context = nextContext;
    $scope.contextId = nextContext.identifier;
    prefetchContext(-2);
  };

  function getNextContext(n) {
   return $scope.contexts[($scope.contexts.indexOf($scope.context) + n + $scope.contexts.length) % $scope.contexts.length];
  }

  function prefetchContext(n) {
    var context = getNextContext(n);
    contextService.getContextByIdentifier(context.identifier);
  }

}]);

