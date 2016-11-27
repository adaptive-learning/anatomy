angular.module('proso.anatomy.controllers')

.controller('relationsModalController', [
    '$scope', '$rootScope', '$modal', '$routeParams', 'userService',
    function ($scope, $rootScope, $modal, $routeParams, userService) {
  $scope.openModal = function() {
    $modal.open({
      templateUrl: '/static/tpl/relations_modal.html',
      size: 'md',
    });
  }; 

  $scope.$on('$routeChangeSuccess', function() {
    if ($routeParams.relationsmodal) {
      $scope.openModal();
    }
  });

  $rootScope.$on('questionSetFinished', function() {
    var showNumberOfAnswers = 30;
    var shouldShow = !userService.status.loading &&
      !userService.user.profile.subscribed &&
      userService.user.profile.number_of_answers >= showNumberOfAnswers && 
      userService.user.profile.number_of_answers < showNumberOfAnswers + 10;
    if (shouldShow) {
      $scope.openModal();
    }
  });
}]);

