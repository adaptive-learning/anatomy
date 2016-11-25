angular.module('proso.anatomy.controllers')

.controller('imageModalController', ['$scope', '$rootScope', '$modal', '$routeParams',       'configService',
        function ($scope, $rootScope, $modal, $routeParams, configService) {

    $scope.openModal = function(config) {

        var modalInstance = $modal.open({
            templateUrl: '/static/tpl/image_modal.html',
            controller: 'imageModalInstanceController',
            size: 'lg',
            resolve: {
                contextId: function () {
                    return config.contextId;
                },
                context: function () {
                    return config.context;
                },
                contexts: function () {
                    return $scope.contexts;
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

    $scope.$watch('context', function(oldContext, newContext) {
      if ($scope.context) {
        $scope.openModal({context: $scope.context});
      }
    });
}]);
