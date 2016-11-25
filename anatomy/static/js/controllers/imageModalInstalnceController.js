angular.module('proso.anatomy.controllers')

.controller('imageModalInstanceController', ['$scope', '$modalInstance', 'contextId', 'context', 'contexts',
    function ($scope, $modalInstance, contextId, context, contexts) {
  $scope.contextId = contextId || context.identifier;
  $scope.context = context;
  $scope.contexts = contexts || [];

  $scope.close = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.next = function() {
    var nextContext = $scope.contexts[($scope.contexts.indexOf($scope.context) + 1) % $scope.contexts.length];
    $scope.context = nextContext;
    $scope.contextId = nextContext.identifier;
  };

  $scope.prew = function() {
    var nextContext = $scope.contexts[($scope.contexts.indexOf($scope.context) - 1 + $scope.contexts.length) % $scope.contexts.length];
    $scope.context = nextContext;
    $scope.contextId = nextContext.identifier;
  };

}]);

