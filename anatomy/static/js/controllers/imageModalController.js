angular.module('proso.anatomy.controllers')

.controller('imageModalController', ['$scope', '$rootScope', '$modal', '$routeParams',
        function ($scope, $rootScope, $modal, $routeParams) {

    $scope.openModal = function(config) {

        var modalInstance = $modal.open({
            templateUrl: '/static/tpl/image_modal.html',
            controller: 'imageModalInstanceController',
            size: 'lg',
            resolve: {
                data: function () {
                  return {
                    contextId: config.contextId,
                    context: $scope.context,
                    contexts: $scope.contexts,
                    category: $scope.category,
                  };
                },
            }
        });
        modalInstance.result.then(function () {
        }, function () {
          if ($scope.context) {
            $scope.context = undefined;
            $scope.openAction(undefined);
          }
        });
    }; 

    $scope.$on('$routeChangeSuccess', function() {
      if ($routeParams.contextmodal) {
        $scope.openModal({contextId: $routeParams.contextmodal});
      }
    });

    $scope.$watch('context', function() {
      if ($scope.context) {
        $scope.openModal({});
      }
    });
}]);
